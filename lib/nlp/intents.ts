import type { Intent } from "@/types";

interface IntentPattern {
  intent: Intent;
  phrases: string[];
}

export const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: "UNDO",
    phrases: ["undo that", "undo", "revert that", "wapas karo", "deshacer", "annuler"],
  },
  {
    intent: "CLEAR",
    phrases: [
      "clear the list", "clear my list", "clear list", "empty the list",
      "empty my list", "delete everything", "remove everything", "start over",
      "sab kuch hata do", "poori list hata do", "saari list hata do",
      "borrar todo", "vaciar la lista", "tout effacer", "vider la liste",
    ],
  },
  {
    intent: "SEARCH",
    phrases: [
      "find me", "find", "search for", "search", "look for", "show me",
      "dhundo", "dhoondo", "khojo", "buscar", "busca", "encuentra",
      "cherche", "chercher", "trouve",
    ],
  },
  {
    intent: "REMOVE",
    phrases: [
      "remove", "delete", "take off", "take out", "drop", "scratch",
      "cancel", "dont need", "do not need", "no longer need",
      "hata do", "hatao", "nikal do", "nikaal do", "हटा दो", "हटाओ",
      "quitar", "quita", "eliminar", "elimina",
      "enlever", "enleve", "supprimer", "supprime",
    ],
  },
  {
    intent: "CHECK_OFF",
    phrases: [
      "check off", "tick off", "mark as bought", "already bought",
      "already got", "i bought", "i got", "picked up",
      "kharid liya", "le liya", "ya compre", "deja achete",
    ],
  },
  {
    intent: "UPDATE_QTY",
    phrases: [
      "make it", "change it to", "change to", "update to",
      "badal do", "cambiar a", "changer en",
    ],
  },
  {
    intent: "ADD",
    phrases: [
      "add", "i need", "we need", "i want to buy", "i want",
      "we are out of", "were out of", "we ran out of", "ran out of",
      "out of", "running low on", "running low",
      "please get", "get me", "get", "buy", "pick up", "put",
      "daal do", "dal do", "add karo", "chahiye",
      "जोड़ो", "डाल दो", "चाहिए",
      "anadir", "añadir", "agregar", "agrega", "necesito", "quiero", "comprar",
      "ajouter", "ajoute", "jai besoin", "besoin de", "acheter",
    ],
  },
];

export interface IntentMatch {
  intent: Intent;
  matched: string | null;
  explicit: boolean;
}

function phraseRegex(phrase: string): RegExp {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}(\\s|$)`);
}

export function detectIntent(text: string): IntentMatch {
  for (const { intent, phrases } of INTENT_PATTERNS) {
    const byLength = [...phrases].sort((a, b) => b.length - a.length);
    for (const phrase of byLength) {
      if (phraseRegex(phrase).test(text)) {
        return { intent, matched: phrase, explicit: true };
      }
    }
  }
  return { intent: "ADD", matched: null, explicit: false };
}

export function stripPhrase(text: string, phrase: string): string {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text
    .replace(new RegExp(`(^|\\s)${escaped}(\\s|$)`), " ")
    .replace(/\s+/g, " ")
    .trim();
}