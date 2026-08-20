import { describe, expect, it } from "vitest";
import { parseWithRules } from "@/lib/nlp/ruleParser";

const THRESHOLD = 0.75;

describe("intent detection", () => {
  it("adds an item from a bare add command", () => {
    const result = parseWithRules("Add milk");
    expect(result.intent).toBe("ADD");
    expect(result.canonicalItem).toBe("milk");
    expect(result.confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("handles need phrasing", () => {
    const result = parseWithRules("I need apples");
    expect(result.intent).toBe("ADD");
    expect(result.canonicalItem).toBe("apples");
  });

  it("handles want-to-buy phrasing", () => {
    const result = parseWithRules("I want to buy bananas");
    expect(result.intent).toBe("ADD");
    expect(result.canonicalItem).toBe("bananas");
  });

  it("treats running out as an add", () => {
    const result = parseWithRules("We are out of eggs");
    expect(result.intent).toBe("ADD");
    expect(result.canonicalItem).toBe("eggs");
  });

  it("removes an item", () => {
    const result = parseWithRules("Remove milk from my list");
    expect(result.intent).toBe("REMOVE");
    expect(result.canonicalItem).toBe("milk");
    expect(result.confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("checks an item off", () => {
    const result = parseWithRules("I got the bread");
    expect(result.intent).toBe("CHECK_OFF");
    expect(result.canonicalItem).toBe("bread");
  });

  it("clears the list without needing an item", () => {
    const result = parseWithRules("Clear my list");
    expect(result.intent).toBe("CLEAR");
    expect(result.confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("recognises undo", () => {
    const result = parseWithRules("Undo that");
    expect(result.intent).toBe("UNDO");
  });
});

describe("quantity and unit parsing", () => {
  it("parses a numeric quantity with a container unit", () => {
    const result = parseWithRules("Add 2 bottles of water");
    expect(result.quantity).toBe(2);
    expect(result.unit).toBe("bottle");
    expect(result.canonicalItem).toBe("water");
  });

  it("parses a bare count", () => {
    const result = parseWithRules("Buy 5 oranges");
    expect(result.quantity).toBe(5);
    expect(result.canonicalItem).toBe("oranges");
  });

  it("parses spelled-out numbers", () => {
    const result = parseWithRules("Add two kilos of rice");
    expect(result.quantity).toBe(2);
    expect(result.unit).toBe("kg");
    expect(result.canonicalItem).toBe("rice");
  });

  it("parses fractional quantities", () => {
    const result = parseWithRules("Add half a kg of tomatoes");
    expect(result.quantity).toBe(0.5);
    expect(result.unit).toBe("kg");
    expect(result.canonicalItem).toBe("tomatoes");
  });

  it("treats dozen as a unit", () => {
    const result = parseWithRules("Add a dozen eggs");
    expect(result.quantity).toBe(1);
    expect(result.unit).toBe("dozen");
    expect(result.canonicalItem).toBe("eggs");
  });

  it("leaves quantity null when none is spoken", () => {
    const result = parseWithRules("Add milk");
    expect(result.quantity).toBeNull();
  });
});

describe("categorisation", () => {
  it("assigns the category from the lexicon", () => {
    expect(parseWithRules("Add paneer").category).toBe("dairy");
    expect(parseWithRules("Add spinach").category).toBe("produce");
    expect(parseWithRules("Add detergent").category).toBe("household");
    expect(parseWithRules("Add toothpaste").category).toBe("personal-care");
  });

  it("prefers the longest matching alias", () => {
    const result = parseWithRules("Add brown bread");
    expect(result.canonicalItem).toBe("brown bread");
  });
});

describe("multilingual input", () => {
  it("parses romanised Hindi", () => {
    const result = parseWithRules("do litre doodh daal do");
    expect(result.intent).toBe("ADD");
    expect(result.canonicalItem).toBe("milk");
    expect(result.quantity).toBe(2);
    expect(result.unit).toBe("litre");
  });

  it("parses Devanagari", () => {
    const result = parseWithRules("दो किलो चावल चाहिए");
    expect(result.intent).toBe("ADD");
    expect(result.canonicalItem).toBe("rice");
    expect(result.quantity).toBe(2);
    expect(result.unit).toBe("kg");
  });

  it("parses Spanish", () => {
    const result = parseWithRules("necesito tres manzanas");
    expect(result.intent).toBe("ADD");
    expect(result.canonicalItem).toBe("apples");
    expect(result.quantity).toBe(3);
  });

  it("parses French", () => {
    const result = parseWithRules("ajouter deux litres de lait");
    expect(result.intent).toBe("ADD");
    expect(result.canonicalItem).toBe("milk");
    expect(result.quantity).toBe(2);
    expect(result.unit).toBe("litre");
  });
});

describe("search and filters", () => {
  it("extracts an organic filter", () => {
    const result = parseWithRules("Find me organic apples");
    expect(result.intent).toBe("SEARCH");
    expect(result.canonicalItem).toBe("apples");
    expect(result.filters?.organic).toBe(true);
  });

  it("extracts a maximum price", () => {
    const result = parseWithRules("Find toothpaste under 150");
    expect(result.intent).toBe("SEARCH");
    expect(result.canonicalItem).toBe("toothpaste");
    expect(result.filters?.maxPrice).toBe(150);
  });

  it("ignores a currency symbol", () => {
    const result = parseWithRules("Find toothpaste under $5");
    expect(result.filters?.maxPrice).toBe(5);
  });

  it("extracts a brand", () => {
    const result = parseWithRules("Search for Amul butter");
    expect(result.filters?.brand).toBe("amul");
    expect(result.canonicalItem).toBe("butter");
  });

  it("combines filters", () => {
    const result = parseWithRules("Show me organic rice under 600");
    expect(result.filters?.organic).toBe(true);
    expect(result.filters?.maxPrice).toBe(600);
    expect(result.canonicalItem).toBe("rice");
  });
});

describe("confidence gating", () => {
  it("scores unknown items below the fallback threshold", () => {
    const result = parseWithRules("Add dragon fruit");
    expect(result.canonicalItem).toBeNull();
    expect(result.confidence).toBeLessThan(THRESHOLD);
  });

  it("scores rambling input below the fallback threshold", () => {
    const result = parseWithRules("umm I think maybe we should probably grab something");
    expect(result.confidence).toBeLessThan(THRESHOLD);
  });

  it("returns UNKNOWN for empty input", () => {
    const result = parseWithRules("   ");
    expect(result.intent).toBe("UNKNOWN");
    expect(result.confidence).toBe(0);
  });

  it("always reports its source", () => {
    expect(parseWithRules("Add milk").source).toBe("rule");
  });
});