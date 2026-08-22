import { NextResponse } from "next/server";
import catalogData from "@/data/catalog.json";
import { getItem } from "@/lib/nlp/lexicon";
import { normalizeSize } from "@/lib/nlp/filters";
import type { CatalogProduct } from "@/types";

const CATALOG = catalogData as CatalogProduct[];

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const item = params.get("item");
  const brand = params.get("brand");
  const size = params.get("size");
  const organic = params.get("organic") === "true";
  const maxPrice = params.get("maxPrice") ? Number(params.get("maxPrice")) : null;
  const minPrice = params.get("minPrice") ? Number(params.get("minPrice")) : null;
  const query = params.get("q")?.toLowerCase() ?? "";

  const wantedSize = size ? normalizeSize(size) : null;

  let results = CATALOG.filter((product) => {
    if (item && product.item !== item) return false;
    if (brand && product.brand.toLowerCase() !== brand.toLowerCase()) return false;
    if (organic && !product.organic) return false;
    if (maxPrice !== null && product.price > maxPrice) return false;
    if (minPrice !== null && product.price < minPrice) return false;
    if (wantedSize && normalizeSize(product.size) !== wantedSize) return false;
    if (query && !product.name.toLowerCase().includes(query)) return false;
    return true;
  });

  results = results.sort((a, b) => a.price - b.price).slice(0, 8);

  const record = item ? getItem(item) : null;
  const noneInStock = results.length === 0 || results.every((product) => !product.inStock);

  return NextResponse.json({
    results,
    substitutes: noneInStock && record ? record.substitutes.slice(0, 3) : [],
  });
}