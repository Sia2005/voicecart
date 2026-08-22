export type Intent =
  | "ADD"
  | "REMOVE"
  | "UPDATE_QTY"
  | "CHECK_OFF"
  | "SEARCH"
  | "CLEAR"
  | "UNDO"
  | "UNKNOWN";

export type Category =
  | "dairy"
  | "produce"
  | "bakery"
  | "meat"
  | "frozen"
  | "pantry"
  | "snacks"
  | "beverages"
  | "household"
  | "personal-care";

export interface SearchFilters {
  maxPrice?: number;
  minPrice?: number;
  brand?: string;
  organic?: boolean;
  size?: string;
}

export interface ParsedCommand {
  intent: Intent;
  canonicalItem: string | null;
  rawItem: string | null;
  quantity: number | null;
  unit: string | null;
  category: Category | null;
  filters: SearchFilters | null;
  confidence: number;
  source: "rule" | "llm";
  transcript: string;
}

export interface ItemRecord {
  category: Category;
  unit: string;
  avgIntervalDays: number;
  substitutes: string[];
  aliases: string[];
}

export interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  item: string;
  category: Category;
  size: string;
  price: number;
  organic: boolean;
  onSale: boolean;
  inStock: boolean;
}