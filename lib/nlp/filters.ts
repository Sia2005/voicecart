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

  return Object.keys(filters).length > 0 ? filters : null;
}

export function stripFilterPhrases(text: string): string {
  return text
    .replace(MAX_PRICE, " ")
    .replace(MIN_PRICE, " ")
    .replace(ORGANIC, " ")
    .replace(/\s+/g, " ")
    .trim();
}