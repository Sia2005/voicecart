"use client";

import { LANGUAGES } from "@/lib/languages";

interface LanguagePickerProps {
  value: string;
  onChange: (code: string) => void;
}

export function LanguagePicker({ value, onChange }: LanguagePickerProps) {
  return (
    <div className="flex border border-rule">
      {LANGUAGES.map((language) => (
        <button
          key={language.code}
          type="button"
          onClick={() => onChange(language.code)}
          aria-pressed={value === language.code}
          className={`px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
            value === language.code ? "bg-ink text-card" : "text-muted hover:text-ink"
          }`}
        >
          {language.short}
        </button>
      ))}
    </div>
  );
}