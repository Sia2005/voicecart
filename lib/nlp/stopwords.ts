const NON_ITEM_WORDS = new Set([
  "metre", "metres", "meter", "meters", "inch", "inches", "feet", "foot",
  "rupee", "rupees", "rs", "dollar", "dollars", "cent", "cents",
  "thing", "things", "stuff", "item", "items", "something", "anything",
  "list", "cart", "basket", "shop", "shopping", "store", "market",
  "today", "tomorrow", "yesterday", "week", "month", "day", "days",
  "please", "thanks", "thank", "okay", "ok", "yes", "no", "hello", "hey",
  "more", "less", "much", "many", "some", "any", "all", "everything",
]);

export function isPlausibleItem(name: string | null): boolean {
  if (!name) return false;

  const cleaned = name.trim().toLowerCase();
  if (cleaned.length < 3) return false;
  if (/^\d+$/.test(cleaned)) return false;

  const words = cleaned.split(/\s+/);
  if (words.length > 4) return false;

  return words.some((word) => !NON_ITEM_WORDS.has(word));
}