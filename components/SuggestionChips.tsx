"use client";

import type { Suggestion } from "@/lib/client/api";

interface SuggestionChipsProps {
  suggestions: Suggestion[];
  onAccept: (suggestion: Suggestion) => void;
}

const KIND_LABELS: Record<Suggestion["kind"], string> = {
  replenish: "Running low",
  seasonal: "In season",
  substitute: "Instead of",
};

export function SuggestionChips({ suggestions, onAccept }: SuggestionChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Suggested</h2>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={`${suggestion.kind}-${suggestion.item}`}
            type="button"
            onClick={() => onAccept(suggestion)}
            title={suggestion.reason}
            className="animate-rise rounded-full border border-line bg-paper-raised px-3 py-1.5 text-left transition-colors hover:border-accent hover:bg-accent-soft"
          >
            <span className="block text-[10px] uppercase tracking-wide text-ink-faint">
              {KIND_LABELS[suggestion.kind]}
            </span>
            <span className="text-sm capitalize">{suggestion.item}</span>
          </button>
        ))}
      </div>
    </section>
  );
}