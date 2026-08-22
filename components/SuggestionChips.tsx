"use client";

import { categoryMeta } from "@/lib/categories";
import type { Suggestion } from "@/lib/client/api";

interface SuggestionChipsProps {
  suggestions: Suggestion[];
  onAccept: (suggestion: Suggestion) => void;
  onDismiss?: () => void;
}

const KIND_LABELS: Record<string, string> = {
  replenish: "Running low",
  seasonal: "In season",
  substitute: "Instead",
  sale: "On sale",
};

export function SuggestionChips({ suggestions, onAccept, onDismiss }: SuggestionChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">Suggested</h2>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="font-mono text-[10px] text-faint hover:text-ink"
          >
            dismiss
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((suggestion) => (
          <button
            key={`${suggestion.kind}-${suggestion.item}`}
            type="button"
            onClick={() => onAccept(suggestion)}
            title={suggestion.reason}
            className="animate-row flex items-center gap-2 rounded-sm border border-rule bg-card px-2.5 py-1.5 text-left transition-colors hover:border-ink"
          >
            <span
              className="h-3 w-[2px] rounded-full"
              style={{ backgroundColor: categoryMeta(suggestion.category).color }}
              aria-hidden="true"
            />
            <span className="text-sm capitalize">{suggestion.item}</span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-faint">
              {KIND_LABELS[suggestion.kind] ?? suggestion.kind}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}