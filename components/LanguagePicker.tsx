"use client";

import { LANGUAGES } from "@/lib/languages";

interface LanguagePickerProps {
  value: string;
  onChange: (code: string) => void;
}

export function LanguagePicker({ value, onChange }: LanguagePickerProps) {
  return (
    <div className="flex gap-1 rounded-full border border-line bg-paper-raised p-1">
      {LANGUAGES.map((language) => (
        <button
          key={language.code}
          type="button"
          onClick={() => onChange(language.code)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            value === language.code ? "bg-ink text-paper" : "text-ink-soft hover:bg-accent-soft"
          }`}
        >
          {language.short}
        </button>
      ))}
    </div>
  );
}