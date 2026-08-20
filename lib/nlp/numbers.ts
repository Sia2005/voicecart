const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  fifteen: 15, twenty: 20, half: 0.5, couple: 2, few: 3,

  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5,
  chhe: 6, saat: 7, aath: 8, nau: 9, das: 10, aadha: 0.5,
  "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5, "पाँच": 5,
  "छह": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10, "आधा": 0.5,

  uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, medio: 0.5,

  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5,
  sept: 7, huit: 8, neuf: 9, dix: 10, demi: 0.5,
};

export function parseNumberToken(token: string): number | null {
  if (!token) return null;

  const cleaned = token.replace(/[₹$,]/g, "");

  if (/^\d+(\.\d+)?$/.test(cleaned)) return Number(cleaned);

  if (/^\d+\/\d+$/.test(cleaned)) {
    const [numerator, denominator] = cleaned.split("/").map(Number);
    return denominator === 0 ? null : numerator / denominator;
  }

  return NUMBER_WORDS[token] ?? null;
}

export function isNumberToken(token: string): boolean {
  return parseNumberToken(token) !== null;
}