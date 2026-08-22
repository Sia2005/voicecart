import { GoogleGenAI } from "@google/genai";
import { allCanonicalItems, getItem, resolveAlias } from "./lexicon";
import { parsedCommandSchema, geminiResponseSchema } from "./schema";
import type { ParsedCommand, SearchFilters } from "@/types";
import { isPlausibleItem } from "./stopwords";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
const TIMEOUT_MS = 6000;

function buildSystemPrompt(): string {
  return [
    "You convert a shopping voice command into structured JSON.",
    "The command may be in English, Hindi (Devanagari or romanised), Spanish or French.",
    "",
    "Always translate the item to its canonical English name.",
    "Prefer a name from this list when the meaning matches:",
    allCanonicalItems().join(", "),
    "",
    "If the item is not in that list, return the plain English name anyway.",
    "Return quantity only when the user spoke one. Return unit only when the user spoke one.",
    "Use SEARCH when the user is looking something up rather than editing the list.",
    "Use CLEAR when the user wants the whole list emptied, with item set to null.",
    "Use UNKNOWN when the command is not about a shopping list.",
    "Set every field you cannot determine to null.",
  ].join("\n");
}

function toParsedCommand(
  raw: unknown,
  transcript: string
): ParsedCommand {
  const parsed = parsedCommandSchema.parse(raw);

  const usableItem = parsed.item && isPlausibleItem(parsed.item) ? parsed.item : null;
  const canonical = usableItem ? resolveAlias(usableItem) : null;
  const record = canonical ? getItem(canonical) : null;

  const filters: SearchFilters = {};
  if (parsed.maxPrice !== null) filters.maxPrice = parsed.maxPrice;
  if (parsed.minPrice !== null) filters.minPrice = parsed.minPrice;
  if (parsed.brand !== null) filters.brand = parsed.brand.toLowerCase();
  if (parsed.organic !== null) filters.organic = parsed.organic;

  return {
    intent: parsed.intent,
    canonicalItem: canonical,
    rawItem: usableItem,
    quantity: parsed.quantity,
    unit: parsed.unit,
    category: record ? record.category : null,
    filters: Object.keys(filters).length > 0 ? filters : null,
    confidence: 0.9,
    source: "llm",
    transcript,
  };
}

export async function parseWithLlm(transcript: string): Promise<ParsedCommand | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const client = new GoogleGenAI({ apiKey });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents: transcript,
      config: {
        systemInstruction: buildSystemPrompt(),
        responseMimeType: "application/json",
        responseSchema: geminiResponseSchema,
        temperature: 0,
        abortSignal: controller.signal,
      },
    });

    const text = response.text;
    if (!text) return null;

    return toParsedCommand(JSON.parse(text), transcript);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}