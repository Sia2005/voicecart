export interface CategoryMeta {
  label: string;
  color: string;
}

export const CATEGORY_ORDER = [
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

export const CATEGORY_META: Record<string, CategoryMeta> = {
  produce: { label: "Produce", color: "#1D5A46" },
  dairy: { label: "Dairy", color: "#3B6EA5" },
  bakery: { label: "Bakery", color: "#A9772C" },
  meat: { label: "Meat & Fish", color: "#9C3B3B" },
  frozen: { label: "Frozen", color: "#4E7F9E" },
  pantry: { label: "Pantry", color: "#6B5B3E" },
  snacks: { label: "Snacks", color: "#8A4B9C" },
  beverages: { label: "Beverages", color: "#2F7F8C" },
  household: { label: "Household", color: "#5A6070" },
  "personal-care": { label: "Personal Care", color: "#A8496E" },
};

export function categoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? { label: category, color: "#6E6879" };
}