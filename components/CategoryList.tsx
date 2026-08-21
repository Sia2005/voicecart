"use client";

import { ItemRow } from "./ItemRow";
import type { ListItem } from "@/lib/client/api";

interface CategoryListProps {
  items: ListItem[];
  isLoading: boolean;
  onToggle: (item: ListItem) => void;
  onDelete: (item: ListItem) => void;
}

const CATEGORY_ORDER = [
  "produce",
  "dairy",
  "bakery",
  "meat",
  "frozen",
  "pantry",
  "snacks",
  "beverages",
  "household",
  "personal-care",
];

const CATEGORY_LABELS: Record<string, string> = {
  produce: "Produce",
  dairy: "Dairy",
  bakery: "Bakery",
  meat: "Meat & Fish",
  frozen: "Frozen",
  pantry: "Pantry",
  snacks: "Snacks",
  beverages: "Beverages",
  household: "Household",
  "personal-care": "Personal Care",
};

export function CategoryList({ items, isLoading, onToggle, onDelete }: CategoryListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-12 animate-pulse rounded-lg bg-line/50" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line px-4 py-10 text-center">
        <p className="text-ink-soft">Your list is empty.</p>
        <p className="mt-1 text-sm text-ink-faint">Try saying &ldquo;add two litres of milk&rdquo;</p>
      </div>
    );
  }

  const grouped = new Map<string, ListItem[]>();
  for (const item of items) {
    const bucket = grouped.get(item.category) ?? [];
    bucket.push(item);
    grouped.set(item.category, bucket);
  }

  const sections = CATEGORY_ORDER.filter((category) => grouped.has(category));

  return (
    <div className="flex flex-col gap-5">
      {sections.map((category) => (
        <section key={category}>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">
            {CATEGORY_LABELS[category] ?? category}
          </h2>
          <ul className="rounded-xl border border-line bg-paper-raised px-3">
            {grouped.get(category)!.map((item) => (
              <ItemRow key={item._id} item={item} onToggle={onToggle} onDelete={onDelete} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}