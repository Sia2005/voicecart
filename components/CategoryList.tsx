"use client";

import { ItemRow } from "./ItemRow";
import { CATEGORY_ORDER, categoryMeta } from "@/lib/categories";
import type { ListItem } from "@/lib/client/api";

interface CategoryListProps {
  items: ListItem[];
  isLoading: boolean;
  onToggle: (item: ListItem) => void;
  onDelete: (item: ListItem) => void;
}

export function CategoryList({ items, isLoading, onToggle, onDelete }: CategoryListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-9 animate-pulse rounded bg-rule/50" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border-y border-rule py-12 text-center">
        <p className="font-display text-xl font-semibold">Nothing on the list yet</p>
        <p className="mt-1 font-mono text-xs text-muted">Try &ldquo;add two litres of milk&rdquo;</p>
      </div>
    );
  }

  const grouped = new Map<string, ListItem[]>();
  for (const item of items) {
    const bucket = grouped.get(item.category) ?? [];
    bucket.push(item);
    grouped.set(item.category, bucket);
  }

  const known = CATEGORY_ORDER.filter((category) => grouped.has(category));
  const unknown = Array.from(grouped.keys()).filter((category) => !CATEGORY_ORDER.includes(category));
  const sections = [...known, ...unknown];

  return (
    <div className="flex flex-col gap-6">
      {sections.map((category) => {
        const meta = categoryMeta(category);
        return (
          <section key={category} className="flex gap-3">
            <span
              className="mt-1.5 w-[3px] shrink-0 rounded-full"
              style={{ backgroundColor: meta.color }}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                {meta.label}
              </h2>
              <ul className="divide-y divide-rule/60">
                {grouped.get(category)!.map((item) => (
                  <ItemRow key={item._id} item={item} onToggle={onToggle} onDelete={onDelete} />
                ))}
              </ul>
            </div>
          </section>
        );
      })}
    </div>
  );
}