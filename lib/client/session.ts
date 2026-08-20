import { nanoid } from "nanoid";

const STORAGE_KEY = "voicecart.session";

export function getClientSessionId(): string {
  if (typeof window === "undefined") return "";

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    const created = nanoid(21);
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return nanoid(21);
  }
}