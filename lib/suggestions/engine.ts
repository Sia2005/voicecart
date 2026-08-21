import seasonalData from "@/data/seasonal.json";
import { getItem, ITEMS } from "@/lib/nlp/lexicon";
import type { PurchaseDocument } from "@/lib/db/models/Purchase";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type SuggestionKind = "replenish" | "seasonal" | "substitute";

export interface Suggestion {
  kind: SuggestionKind;
  item: string;
  reason: string;
  category: string;
}

interface SeasonalEntry {
  note: string;
  inSeason: string[];
}

const SEASONAL = seasonalData as Record<string, SeasonalEntry>;

function daysSince(date: Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / MS_PER_DAY);
}

function expectedInterval(purchase: PurchaseDocument): number {
  if (purchase.intervals.length > 0) {
    const total = purchase.intervals.reduce((sum, value) => sum + value, 0);
    return total / purchase.intervals.length;
  }

  const record = getItem(purchase.canonicalItem);
  return record ? record.avgIntervalDays : 14;
}

export function replenishmentSuggestions(
  purchases: PurchaseDocument[],
  itemsOnList: Set<string>
): Suggestion[] {
  return purchases
    .filter((purchase) => !itemsOnList.has(purchase.canonicalItem))
    .map((purchase) => {
      const elapsed = daysSince(purchase.lastPurchasedAt);
      const interval = expectedInterval(purchase);
      return { purchase, elapsed, interval, ratio: elapsed / interval };
    })
    .filter((entry) => entry.ratio >= 0.8)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 3)
    .map((entry) => ({
      kind: "replenish" as const,
      item: entry.purchase.canonicalItem,
      reason:
        entry.elapsed <= 1
          ? `You usually buy this every ${Math.round(entry.interval)} days`
          : `Last added ${entry.elapsed} days ago`,
      category: entry.purchase.category,
    }));
}

export function seasonalSuggestions(itemsOnList: Set<string>, month: number): Suggestion[] {
  const entry = SEASONAL[String(month)];
  if (!entry) return [];

  return entry.inSeason
    .filter((item) => ITEMS[item] && !itemsOnList.has(item))
    .slice(0, 3)
    .map((item) => ({
      kind: "seasonal" as const,
      item,
      reason: entry.note,
      category: ITEMS[item].category,
    }));
}

export function substituteSuggestions(canonicalItem: string): Suggestion[] {
  const record = getItem(canonicalItem);
  if (!record) return [];

  return record.substitutes.slice(0, 3).map((substitute) => ({
    kind: "substitute" as const,
    item: substitute,
    reason: `Alternative to ${canonicalItem}`,
    category: record.category,
  }));
}