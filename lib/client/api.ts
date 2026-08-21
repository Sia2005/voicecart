import { getClientSessionId } from "./session";
import type { CatalogProduct, ParsedCommand, SearchFilters } from "@/types";

export interface ListItem {
  _id: string;
  canonicalItem: string | null;
  displayName: string;
  quantity: number | null;
  unit: string | null;
  category: string;
  checked: boolean;
  createdAt: string;
}

export interface Suggestion {
  kind: "replenish" | "seasonal" | "substitute";
  item: string;
  reason: string;
  category: string;
}

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-session-id": getClientSessionId(),
  };
}

async function unwrap<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error ?? "Request failed");
  }
  return response.json() as Promise<T>;
}

export async function parseTranscript(transcript: string): Promise<ParsedCommand> {
  const response = await fetch("/api/parse", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ transcript }),
  });
  return unwrap<ParsedCommand>(response);
}

export async function fetchItems(): Promise<ListItem[]> {
  const response = await fetch("/api/items", { headers: headers() });
  const body = await unwrap<{ items: ListItem[] }>(response);
  return body.items;
}

export async function createItem(command: ParsedCommand): Promise<ListItem> {
  const response = await fetch("/api/items", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      canonicalItem: command.canonicalItem,
      displayName: command.canonicalItem ?? command.rawItem ?? "item",
      quantity: command.quantity,
      unit: command.unit,
      category: command.category ?? "pantry",
    }),
  });
  const body = await unwrap<{ item: ListItem }>(response);
  return body.item;
}

export async function addByName(name: string, category: string): Promise<ListItem> {
  const response = await fetch("/api/items", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      canonicalItem: name,
      displayName: name,
      quantity: null,
      unit: null,
      category,
    }),
  });
  const body = await unwrap<{ item: ListItem }>(response);
  return body.item;
}

export async function updateItem(
  id: string,
  patch: { quantity?: number | null; checked?: boolean }
): Promise<ListItem> {
  const response = await fetch(`/api/items/${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(patch),
  });
  const body = await unwrap<{ item: ListItem }>(response);
  return body.item;
}

export async function deleteItem(id: string): Promise<void> {
  const response = await fetch(`/api/items/${id}`, { method: "DELETE", headers: headers() });
  await unwrap<{ deleted: string }>(response);
}

export async function clearList(): Promise<void> {
  const response = await fetch("/api/items", { method: "DELETE", headers: headers() });
  await unwrap<{ deleted: number }>(response);
}

export async function fetchSuggestions(): Promise<Suggestion[]> {
  const response = await fetch("/api/suggestions", { headers: headers() });
  const body = await unwrap<{ suggestions: Suggestion[] }>(response);
  return body.suggestions;
}

export async function searchCatalog(
  item: string | null,
  rawItem: string | null,
  filters: SearchFilters | null
): Promise<{ results: CatalogProduct[]; substitutes: string[] }> {
  const params = new URLSearchParams();
  if (item) params.set("item", item);
  else if (rawItem) params.set("q", rawItem);
  if (filters?.brand) params.set("brand", filters.brand);
  if (filters?.organic) params.set("organic", "true");
  if (filters?.maxPrice !== undefined) params.set("maxPrice", String(filters.maxPrice));
  if (filters?.minPrice !== undefined) params.set("minPrice", String(filters.minPrice));

  const response = await fetch(`/api/search?${params.toString()}`);
  return unwrap<{ results: CatalogProduct[]; substitutes: string[] }>(response);
} 