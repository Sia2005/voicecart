"use client";

import type { RecognitionStatus } from "@/hooks/useSpeechRecognition";

interface MicButtonProps {
  status: RecognitionStatus;
  isBusy: boolean;
  onStart: () => void;
  onStop: () => void;
}

const LABELS: Record<RecognitionStatus, string> = {
  idle: "Tap to speak",
  listening: "Listening…",
  denied: "Microphone blocked",
  unsupported: "Voice unavailable",
  error: "Tap to retry",
};

export function MicButton({ status, isBusy, onStart, onStop }: MicButtonProps) {
  const isListening = status === "listening";
  const isDisabled = status === "unsupported" || status === "denied";

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={isListening ? onStop : onStart}
        disabled={isDisabled}
        aria-label={LABELS[status]}
        className={`flex h-24 w-24 items-center justify-center rounded-full transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-line ${
          isListening ? "bg-danger mic-listening" : "bg-accent"
        }`}
      >
        {isBusy ? (
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="white" strokeWidth="1.8">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0" strokeLinecap="round" />
            <path d="M12 18v3" strokeLinecap="round" />
          </svg>
        )}
      </button>

      <p className="text-sm text-ink-soft">{isBusy ? "Working on it…" : LABELS[status]}</p>
    </div>
  );
}