const UNIT_ALIASES: Record<string, string> = {
  kg: "kg", kgs: "kg", kilo: "kg", kilos: "kg",
  kilogram: "kg", kilograms: "kg", "किलो": "kg",

  g: "g", gm: "g", gms: "g", gram: "g", grams: "g", "ग्राम": "g",

  l: "litre", lt: "litre", litre: "litre", litres: "litre",
  liter: "litre", liters: "litre", "लीटर": "litre",

  ml: "ml", millilitre: "ml", millilitres: "ml", milliliters: "ml",

  pack: "pack", packs: "pack", packet: "pack", packets: "pack",
  pouch: "pack", pouches: "pack",

  bottle: "bottle", bottles: "bottle",
  loaf: "loaf", loaves: "loaf",
  dozen: "dozen", dozens: "dozen",
  piece: "piece", pieces: "piece", pcs: "piece", pc: "piece",
  bunch: "bunch", bunches: "bunch",
  box: "box", boxes: "box",
  can: "can", cans: "can", tin: "can", tins: "can",
  jar: "jar", jars: "jar",
  bag: "bag", bags: "bag",
  carton: "carton", cartons: "carton",
};

export function normalizeUnit(token: string): string | null {
  if (!token) return null;
  return UNIT_ALIASES[token.toLowerCase()] ?? null;
}

export function isUnitToken(token: string): boolean {
  return normalizeUnit(token) !== null;
}