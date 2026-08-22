"use client";

import type { RecognitionStatus } from "@/hooks/useSpeechRecognition";

interface MicButtonProps {
  status: RecognitionStatus;
  isBusy: boolean;
  onStart: () => void;
  onStop: () => void;
}

const LABELS: Record<RecognitionStatus, string> = {
  idle: "Hold the mic, say what you need",
  listening: "Listening",
  denied: "Allow microphone access to speak",
  unsupported: "Type your command below",
  error: "Didn't catch that — tap to retry",
};

export function MicButton({ status, isBusy, onStart, onStop }: MicButtonProps) {
  const isListening = status === "listening";
  const isDisabled = status === "unsupported" || status === "denied";

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={isListening ? onStop : onStart}
        disabled={isDisabled}
        aria-label={LABELS[status]}
        className={`flex h-16 w-16 items-center justify-center rounded-full border transition-transform active:scale-95 disabled:cursor-not-allowed disabled:border-rule disabled:bg-transparent ${
          isListening ? "listening-ring border-beet bg-beet" : "border-ink bg-ink"
        }`}
      >
        {isBusy ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-card border-t-transparent" />
        ) : (
          <svg
            viewBox="0 0 24 24"
            className={`h-7 w-7 ${isDisabled ? "stroke-faint" : "stroke-card"}`}
            fill="none"
            strokeWidth="1.6"
          >
            <rect x="9.5" y="3.5" width="5" height="10" rx="2.5" />
            <path d="M5.5 11a6.5 6.5 0 0 0 13 0" strokeLinecap="round" />
            <path d="M12 17.5V21" strokeLinecap="round" />
          </svg>
        )}
      </button>

      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
        {isBusy ? "Working" : LABELS[status]}
      </p>
    </div>
  );
}