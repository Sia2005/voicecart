"use client";

import type { ListItem } from "@/lib/client/api";

interface ItemRowProps {
  item: ListItem;
  onToggle: (item: ListItem) => void;
  onDelete: (item: ListItem) => void;
}

function formatQuantity(item: ListItem): string | null {
  if (item.quantity === null) return null;
  return item.unit ? `${item.quantity} ${item.unit}` : String(item.quantity);
}

export function ItemRow({ item, onToggle, onDelete }: ItemRowProps) {
  const quantity = formatQuantity(item);

  return (
    <li className="animate-rise flex items-center gap-3 border-b border-line px-1 py-3 last:border-b-0">
      <button
        type="button"
        onClick={() => onToggle(item)}
        aria-label={item.checked ? `Uncheck ${item.displayName}` : `Check off ${item.displayName}`}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          item.checked ? "border-live bg-live" : "border-line"
        }`}
      >
        {item.checked && (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="white" strokeWidth="3">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <span className={`flex-1 capitalize ${item.checked ? "text-ink-faint line-through" : ""}`}>
        {item.displayName}
      </span>

      {quantity && (
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-ink-soft">
          {quantity}
        </span>
      )}

      <button
        type="button"
        onClick={() => onDelete(item)}
        aria-label={`Remove ${item.displayName}`}
        className="px-1 text-ink-faint transition-colors hover:text-danger"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  );
}