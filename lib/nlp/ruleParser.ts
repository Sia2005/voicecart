import { detectIntent, stripPhrase } from "./intents";
import { extractFilters, stripFilterPhrases } from "./filters";
import { getItem, resolveAlias, MAX_ALIAS_WORDS } from "./lexicon";
import { parseNumberToken } from "./numbers";
import { normalizeUnit } from "./units";
import type { Intent, ParsedCommand, SearchFilters } from "@/types";
import { isPlausibleItem } from "./stopwords";

const FILLER_WORDS = new Set([
  "please", "my", "the", "a", "an", "some", "to", "from", "list",
  "shopping", "of", "for", "me", "i", "we", "and", "um", "umm", "uh",
  "also", "just", "kuch", "mere", "liye", "por", "favor", "el", "la",
  "en", "de", "du", "les", "s",
]);

interface ItemMatch {
  canonical: string;
  raw: string;
  start: number;
  end: number;
}

interface QuantityMatch {
  quantity: number;
  unit: string | null;
}

export function normalizeTranscript(input: string): string {
  return input
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[.,!?;:"`()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findItem(tokens: string[]): ItemMatch | null {
  const longest = Math.min(MAX_ALIAS_WORDS, tokens.length);

  for (let size = longest; size >= 1; size--) {
    for (let start = 0; start + size <= tokens.length; start++) {
      const phrase = tokens.slice(start, start + size).join(" ");
      if (size === 1 && FILLER_WORDS.has(phrase)) continue;
      const canonical = resolveAlias(phrase);
      if (canonical) {
        return { canonical, raw: phrase, start, end: start + size };
      }
    }
  }

  return null;
}

function findQuantity(tokens: string[], itemStart: number | null): QuantityMatch | null {
  for (let index = 0; index < tokens.length; index++) {
    const value = parseNumberToken(tokens[index]);
    if (value === null) continue;

    let cursor = index + 1;
    let unit: string | null = null;

    while (tokens[cursor] === "a" || tokens[cursor] === "an" || tokens[cursor] === "of") {
      cursor += 1;
    }

    const candidateUnit = tokens[cursor] ? normalizeUnit(tokens[cursor]) : null;
    if (candidateUnit) {
      unit = candidateUnit;
      cursor += 1;
    }

    if (tokens[cursor] === "of") cursor += 1;

    const itemFollowsClosely =
      itemStart !== null && itemStart >= index && itemStart - cursor <= 2;

    if (unit || itemFollowsClosely) {
      return { quantity: value, unit };
    }
  }

  return null;
}

function residualItem(tokens: string[]): string {
  return tokens
    .filter(
      (token) =>
        !FILLER_WORDS.has(token) &&
        parseNumberToken(token) === null &&
        normalizeUnit(token) === null
    )
    .join(" ")
    .trim();
}

function scoreConfidence(input: {
  intent: Intent;
  explicit: boolean;
  hasCanonical: boolean;
  hasRaw: boolean;
  hasQuantity: boolean;
  hasFilters: boolean;
}): number {
  if (input.intent === "CLEAR" || input.intent === "UNDO") {
    return input.explicit ? 0.95 : 0.2;
  }

  let score = input.explicit ? 0.45 : 0.15;

  if (input.hasCanonical) {
    score += 0.45;
  } else if (input.hasRaw) {
    score += input.intent === "SEARCH" ? 0.35 : 0.15;
  }

  if (input.hasQuantity) score += 0.1;
  if (input.hasFilters) score += 0.1;

  return Math.min(1, Number(score.toFixed(2)));
}

export function parseWithRules(transcript: string): ParsedCommand {
  const normalized = normalizeTranscript(transcript);

  if (!normalized) {
    return {
      intent: "UNKNOWN",
      canonicalItem: null,
      rawItem: null,
      quantity: null,
      unit: null,
      category: null,
      filters: null,
      confidence: 0,
      source: "rule",
      transcript,
    };
  }

  const intentMatch = detectIntent(normalized);

  const withoutIntent = intentMatch.matched
    ? stripPhrase(normalized, intentMatch.matched)
    : normalized;

  const isSearch = intentMatch.intent === "SEARCH";
  const filters: SearchFilters | null = isSearch ? extractFilters(withoutIntent) : null;
  const searchable = isSearch ? stripFilterPhrases(withoutIntent) : withoutIntent;

  const tokens = searchable.split(" ").filter(Boolean);
  const itemMatch = findItem(tokens);
  const quantityMatch = findQuantity(tokens, itemMatch ? itemMatch.start : null);
  const record = itemMatch ? getItem(itemMatch.canonical) : null;
  const rawItem = itemMatch ? itemMatch.raw : residualItem(tokens);

  return {
    intent: intentMatch.intent,
    canonicalItem: itemMatch ? itemMatch.canonical : null,
        rawItem: rawItem.length > 0 && isPlausibleItem(rawItem) ? rawItem : null,
    quantity: quantityMatch ? quantityMatch.quantity : null,
    unit: quantityMatch ? quantityMatch.unit : null,
    category: record ? record.category : null,
    filters,
    confidence: scoreConfidence({
      intent: intentMatch.intent,
      explicit: intentMatch.explicit,
      hasCanonical: itemMatch !== null,
      hasRaw: rawItem.length > 0,
      hasQuantity: quantityMatch !== null,
      hasFilters: filters !== null,
    }),
    source: "rule",
    transcript,
  };
}