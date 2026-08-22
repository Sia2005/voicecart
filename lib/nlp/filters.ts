import catalogData from "@/data/catalog.json";
import type { CatalogProduct, SearchFilters } from "@/types";

const CATALOG = catalogData as CatalogProduct[];

const BRANDS = Array.from(
  new Set(CATALOG.map((product) => product.brand.toLowerCase()))
).sort((a, b) => b.length - a.length);

const MAX_PRICE =
  /(?:under|below|less than|cheaper than|up to|upto|within|not more than)\s*[₹$]?\s*(\d+(?:\.\d+)?)/;

const MIN_PRICE =
  /(?:over|above|more than|at least|starting from)\s*[₹$]?\s*(\d+(?:\.\d+)?)/;

const ORGANIC = /(^|\s)organic(\s|$)/;

const SIZE = /(\d+(?:\.\d+)?)\s*(kgs?|kilos?|gms?|grams?|g|ml|millilitres?|litres?|liters?|lt|l|pcs|pieces|pc)\b/;

const SIZE_UNITS: Record<string, string> = {
  kg: "kg", kgs: "kg", kilo: "kg", kilos: "kg",
  g: "g", gm: "g", gms: "g", gram: "g", grams: "g",
  ml: "ml", millilitre: "ml", millilitres: "ml",
  l: "l", lt: "l", litre: "l", litres: "l", liter: "l", liters: "l",
  pc: "pcs", pcs: "pcs", piece: "pcs", pieces: "pcs",
};

export function normalizeSize(value: string): string {
  const match = value.toLowerCase().match(SIZE);
  if (!match) return value.toLowerCase().replace(/\s+/g, "");
  const unit = SIZE_UNITS[match[2]] ?? match[2];
  return `${Number(match[1])}${unit}`;
}

export function extractFilters(text: string): SearchFilters | null {
  const filters: SearchFilters = {};

  const maxMatch = text.match(MAX_PRICE);
  if (maxMatch) filters.maxPrice = Number(maxMatch[1]);

  const minMatch = text.match(MIN_PRICE);
  if (minMatch) filters.minPrice = Number(minMatch[1]);

  if (ORGANIC.test(text)) filters.organic = true;

  const brand = BRANDS.find((candidate) =>
    new RegExp(`(^|\\s)${candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(text)
  );
  if (brand) filters.brand = brand;

  const withoutPrices = text.replace(MAX_PRICE, " ").replace(MIN_PRICE, " ");
  const sizeMatch = withoutPrices.match(SIZE);
  if (sizeMatch) filters.size = normalizeSize(sizeMatch[0]);

  return Object.keys(filters).length > 0 ? filters : null;
}

export function stripFilterPhrases(text: string): string {
  return text
    .replace(MAX_PRICE, " ")
    .replace(MIN_PRICE, " ")
    .replace(ORGANIC, " ")
    .replace(SIZE, " ")
    .replace(/\s+/g, " ")
    .trim();
}