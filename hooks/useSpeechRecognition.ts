"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecognitionStatus = "idle" | "listening" | "denied" | "unsupported" | "error";

interface UseSpeechRecognitionOptions {
  language: string;
  onFinalTranscript: (transcript: string) => void;
}

interface UseSpeechRecognitionResult {
  status: RecognitionStatus;
  interimTranscript: string;
  errorMessage: string | null;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access is blocked. Enable it in your browser settings.",
  "service-not-allowed": "Microphone access is blocked. Enable it in your browser settings.",
  "no-speech": "I didn't catch that — try again.",
  "audio-capture": "No microphone found.",
  network: "Speech service is unreachable. Check your connection.",
  aborted: "",
};

export function useSpeechRecognition({
  language,
  onFinalTranscript,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionResult {
  const [status, setStatus] = useState<RecognitionStatus>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const callbackRef = useRef(onFinalTranscript);
  const languageRef = useRef(language);

  useEffect(() => {
    callbackRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    languageRef.current = language;
    if (recognitionRef.current) recognitionRef.current.lang = language;
  }, [language]);

  useEffect(() => {
    const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Constructor) {
      setIsSupported(false);
      setStatus("unsupported");
      return;
    }

    const recognition = new Constructor();
    recognition.lang = languageRef.current;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus("listening");
      setErrorMessage(null);
      setInterimTranscript("");
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      setInterimTranscript(interim);

      if (final.trim().length > 0) {
        setInterimTranscript("");
        callbackRef.current(final.trim());
      }
    };

    recognition.onerror = (event) => {
      const blocked = event.error === "not-allowed" || event.error === "service-not-allowed";
      setStatus(blocked ? "denied" : "error");
      setErrorMessage(ERROR_MESSAGES[event.error] || null);
      setInterimTranscript("");
    };

    recognition.onend = () => {
      setStatus((current) => (current === "listening" ? "idle" : current));
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    setErrorMessage(null);

    try {
      recognition.lang = languageRef.current;
      recognition.start();
    } catch {
      setStatus("listening");
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { status, interimTranscript, errorMessage, isSupported, start, stop };
}