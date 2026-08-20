import itemsData from "@/data/items.json";
import type { ItemRecord } from "@/types";

export const ITEMS = itemsData as unknown as Record<string, ItemRecord>;

const aliasToCanonical = new Map<string, string>();

for (const [canonical, record] of Object.entries(ITEMS)) {
  aliasToCanonical.set(canonical.toLowerCase(), canonical);
  for (const alias of record.aliases) {
    aliasToCanonical.set(alias.toLowerCase(), canonical);
  }
}

export const MAX_ALIAS_WORDS = Math.max(
  ...Array.from(aliasToCanonical.keys(), (alias) => alias.split(/\s+/).length)
);

export function resolveAlias(phrase: string): string | null {
  const key = phrase.toLowerCase().trim();

  const direct = aliasToCanonical.get(key);
  if (direct) return direct;

  if (key.endsWith("es")) {
    const singular = aliasToCanonical.get(key.slice(0, -2));
    if (singular) return singular;
  }

  if (key.endsWith("s")) {
    const singular = aliasToCanonical.get(key.slice(0, -1));
    if (singular) return singular;
  }

  return null;
}

export function getItem(canonical: string): ItemRecord | null {
  return ITEMS[canonical] ?? null;
}

export function allCanonicalItems(): string[] {
  return Object.keys(ITEMS);
}