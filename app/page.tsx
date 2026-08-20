"use client";

import { useCallback, useState } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { LANGUAGES, DEFAULT_LANGUAGE } from "@/lib/languages";
import { getClientSessionId } from "@/lib/client/session";
import type { ParsedCommand } from "@/types";

export default function Home() {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [command, setCommand] = useState<ParsedCommand | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const { speak } = useSpeechSynthesis(true);

  const handleTranscript = useCallback(
    async (transcript: string) => {
      setIsParsing(true);
      try {
        const response = await fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript }),
        });
        const result: ParsedCommand = await response.json();
        setCommand(result);
        speak(`${result.intent} ${result.canonicalItem ?? result.rawItem ?? ""}`, language);
      } finally {
        setIsParsing(false);
      }
    },
    [language, speak]
  );

  const { status, interimTranscript, errorMessage, isSupported, start, stop } =
    useSpeechRecognition({ language, onFinalTranscript: handleTranscript });

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">VoiceCart smoke test</h1>

      <p className="text-sm text-ink-soft">session: {getClientSessionId().slice(0, 8)}</p>

      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        className="rounded border border-line bg-paper-raised p-2"
      >
        {LANGUAGES.map((entry) => (
          <option key={entry.code} value={entry.code}>
            {entry.label}
          </option>
        ))}
      </select>

      <button
        onClick={status === "listening" ? stop : start}
        disabled={!isSupported}
        className={`rounded-full bg-accent px-6 py-4 font-medium text-white disabled:opacity-40 ${
          status === "listening" ? "mic-listening" : ""
        }`}
      >
        {status === "listening" ? "Listening — tap to stop" : "Tap and speak"}
      </button>

      <p className="text-sm">status: {status}</p>
      {interimTranscript && <p className="italic text-ink-faint">{interimTranscript}</p>}
      {errorMessage && <p className="text-danger">{errorMessage}</p>}
      {isParsing && <p className="text-live">parsing…</p>}

      {command && (
        <pre className="overflow-auto rounded bg-paper-raised p-3 text-xs">
          {JSON.stringify(command, null, 2)}
        </pre>
      )}
    </main>
  );
}
