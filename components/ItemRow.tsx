"use client";

import type { ListItem } from "@/lib/client/api";

interface ItemRowProps {
  item: ListItem;
  onToggle: (item: ListItem) => void;
  onDelete: (item: ListItem) => void;
}

function formatQuantity(item: ListItem): string {
  if (item.quantity === null) return "1";
  return item.unit ? `${item.quantity} ${item.unit}` : String(item.quantity);
}

export function ItemRow({ item, onToggle, onDelete }: ItemRowProps) {
  return (
    <li className="animate-row group flex items-baseline gap-2 py-2.5">
      <button
        type="button"
        onClick={() => onToggle(item)}
        aria-label={item.checked ? `Uncheck ${item.displayName}` : `Check off ${item.displayName}`}
        className={`relative top-0.5 h-4 w-4 shrink-0 rounded-sm border transition-colors ${
          item.checked ? "border-pine bg-pine" : "border-rule bg-card hover:border-ink"
        }`}
      >
        {item.checked && (
          <svg viewBox="0 0 16 16" className="h-full w-full" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M3.5 8.5l3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <span
        className={`shrink-0 capitalize transition-colors ${
          item.checked ? "text-faint line-through" : "text-ink"
        }`}
      >
        {item.displayName}
      </span>

      <span className="leader" aria-hidden="true" />

      <span
        className={`shrink-0 font-mono text-sm tabular-nums ${
          item.checked ? "text-faint" : "text-muted"
        }`}
      >
        {formatQuantity(item)}
      </span>

      <button
        type="button"
        onClick={() => onDelete(item)}
        aria-label={`Remove ${item.displayName}`}
        className="shrink-0 px-1 text-faint opacity-0 transition-opacity hover:text-beet focus-visible:opacity-100 group-hover:opacity-100"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  );
}