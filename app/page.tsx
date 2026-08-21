"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MicButton } from "@/components/MicButton";
import { LanguagePicker } from "@/components/LanguagePicker";
import { CategoryList } from "@/components/CategoryList";
import { SuggestionChips } from "@/components/SuggestionChips";
import { SearchResults } from "@/components/SearchResults";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { DEFAULT_LANGUAGE } from "@/lib/languages";
import {
  addByName,
  clearList,
  createItem,
  deleteItem,
  fetchItems,
  fetchSuggestions,
  parseTranscript,
  searchCatalog,
  updateItem,
  type ListItem,
  type Suggestion,
} from "@/lib/client/api";
import type { CatalogProduct, ParsedCommand } from "@/types";

interface SearchState {
  query: string;
  results: CatalogProduct[];
  substitutes: string[];
}

interface Feedback {
  tone: "success" | "error" | "neutral";
  message: string;
}

export default function Home() {
  const [items, setItems] = useState<ListItem[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [search, setSearch] = useState<SearchState | null>(null);
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [typed, setTyped] = useState("");
  const [voiceReplies, setVoiceReplies] = useState(true);

  const lastDeleted = useRef<ListItem | null>(null);
  const { speak } = useSpeechSynthesis(voiceReplies);

  const announce = useCallback(
    (tone: Feedback["tone"], message: string, spoken?: string) => {
      setFeedback({ tone, message });
      if (spoken) speak(spoken, language);
    },
    [language, speak]
  );

  const refresh = useCallback(async () => {
    const [nextItems, nextSuggestions] = await Promise.all([
      fetchItems(),
      fetchSuggestions().catch(() => []),
    ]);
    setItems(nextItems);
    setSuggestions(nextSuggestions);
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => announce("error", "Could not load your list."))
      .finally(() => setIsLoading(false));
  }, [refresh, announce]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const findOnList = useCallback(
    (command: ParsedCommand): ListItem | undefined => {
      const target = command.canonicalItem ?? command.rawItem;
      if (!target) return undefined;
      return items.find(
        (item) =>
          item.canonicalItem === target ||
          item.displayName.toLowerCase() === target.toLowerCase()
      );
    },
    [items]
  );

  const runCommand = useCallback(
    async (command: ParsedCommand) => {
      const label = command.canonicalItem ?? command.rawItem ?? "that";

      switch (command.intent) {
        case "ADD": {
          if (!command.canonicalItem && !command.rawItem) {
            announce("error", "I didn't catch an item.");
            return;
          }
          await createItem(command);
          announce("success", `Added ${label}`, `Added ${label}`);
          break;
        }

        case "REMOVE": {
          const existing = findOnList(command);
          if (!existing) {
            announce("error", `${label} isn't on your list.`, `${label} is not on your list`);
            return;
          }
          lastDeleted.current = existing;
          await deleteItem(existing._id);
          announce("success", `Removed ${label}`, `Removed ${label}`);
          break;
        }

        case "CHECK_OFF": {
          const existing = findOnList(command);
          if (!existing) {
            announce("error", `${label} isn't on your list.`);
            return;
          }
          await updateItem(existing._id, { checked: true });
          announce("success", `Checked off ${label}`, `Checked off ${label}`);
          break;
        }

        case "UPDATE_QTY": {
          const existing = findOnList(command);
          if (!existing || command.quantity === null) {
            announce("error", "Tell me the item and the new quantity.");
            return;
          }
          await updateItem(existing._id, { quantity: command.quantity });
          announce("success", `${label} is now ${command.quantity}`, `Updated ${label}`);
          break;
        }

        case "SEARCH": {
          const found = await searchCatalog(command.canonicalItem, command.rawItem, command.filters);
          setSearch({ query: label, results: found.results, substitutes: found.substitutes });
          announce(
            "neutral",
            `${found.results.length} result${found.results.length === 1 ? "" : "s"} for ${label}`,
            found.results.length > 0 ? `Found ${found.results.length} options` : "Nothing matched"
          );
          return;
        }

        case "CLEAR": {
          await clearList();
          announce("success", "List cleared", "List cleared");
          break;
        }

        case "UNDO": {
          const restore = lastDeleted.current;
          if (!restore) {
            announce("error", "Nothing to undo.");
            return;
          }
          await addByName(restore.canonicalItem ?? restore.displayName, restore.category);
          lastDeleted.current = null;
          announce("success", `Restored ${restore.displayName}`, `Restored ${restore.displayName}`);
          break;
        }

        default: {
          announce("error", "I didn't understand that.", "Sorry, I did not understand");
          return;
        }
      }

      await refresh();
    },
    [announce, findOnList, refresh]
  );

  const handleTranscript = useCallback(
    async (transcript: string) => {
      setIsBusy(true);
      try {
        const command = await parseTranscript(transcript);
        await runCommand(command);
      } catch {
        announce("error", "Something went wrong. Try again.");
      } finally {
        setIsBusy(false);
      }
    },
    [runCommand, announce]
  );

  const { status, interimTranscript, errorMessage, start, stop } = useSpeechRecognition({
    language,
    onFinalTranscript: handleTranscript,
  });

  const handleTyped = useCallback(async () => {
    const value = typed.trim();
    if (!value) return;
    setTyped("");
    await handleTranscript(value);
  }, [typed, handleTranscript]);

  const handleToggle = useCallback(
    async (item: ListItem) => {
      setItems((current) =>
        current.map((entry) =>
          entry._id === item._id ? { ...entry, checked: !entry.checked } : entry
        )
      );
      try {
        await updateItem(item._id, { checked: !item.checked });
        await refresh();
      } catch {
        announce("error", "Could not update that item.");
        await refresh();
      }
    },
    [refresh, announce]
  );

  const handleDelete = useCallback(
    async (item: ListItem) => {
      lastDeleted.current = item;
      setItems((current) => current.filter((entry) => entry._id !== item._id));
      try {
        await deleteItem(item._id);
        await refresh();
      } catch {
        announce("error", "Could not remove that item.");
        await refresh();
      }
    },
    [refresh, announce]
  );

  const handleSuggestion = useCallback(
    async (suggestion: Suggestion) => {
      try {
        await addByName(suggestion.item, suggestion.category);
        announce("success", `Added ${suggestion.item}`);
        await refresh();
      } catch {
        announce("error", "Could not add that.");
      }
    },
    [refresh, announce]
  );

  const handleAddProduct = useCallback(
    async (product: CatalogProduct) => {
      try {
        await addByName(product.item, product.category);
        announce("success", `Added ${product.name}`);
        setSearch(null);
        await refresh();
      } catch {
        announce("error", "Could not add that.");
      }
    },
    [refresh, announce]
  );

  const handleAddSubstitute = useCallback(
    async (name: string) => {
      try {
        await addByName(name, "pantry");
        announce("success", `Added ${name}`);
        setSearch(null);
        await refresh();
      } catch {
        announce("error", "Could not add that.");
      }
    },
    [refresh, announce]
  );

  const remaining = items.filter((item) => !item.checked).length;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 pb-40 pt-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">VoiceCart</h1>
          <p className="text-sm text-ink-soft">
            {remaining} item{remaining === 1 ? "" : "s"} to buy
          </p>
        </div>
        <LanguagePicker value={language} onChange={setLanguage} />
      </header>

      <SuggestionChips suggestions={suggestions} onAccept={handleSuggestion} />

      {search && (
        <SearchResults
          query={search.query}
          results={search.results}
          substitutes={search.substitutes}
          onAdd={handleAddProduct}
          onAddSubstitute={handleAddSubstitute}
          onDismiss={() => setSearch(null)}
        />
      )}

      <CategoryList
        items={items}
        isLoading={isLoading}
        onToggle={handleToggle}
        onDelete={handleDelete}
      />

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-4">
          {interimTranscript && (
            <p className="animate-rise text-sm italic text-ink-faint">{interimTranscript}</p>
          )}

          {feedback && (
            <p
              role="status"
              className={`animate-rise text-sm ${
                feedback.tone === "error"
                  ? "text-danger"
                  : feedback.tone === "success"
                    ? "text-live"
                    : "text-ink-soft"
              }`}
            >
              {feedback.message}
            </p>
          )}

          {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}

          <MicButton status={status} isBusy={isBusy} onStart={start} onStop={stop} />

          <div className="flex w-full items-center gap-2">
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleTyped();
              }}
              placeholder="or type a command"
              className="flex-1 rounded-full border border-line bg-paper-raised px-4 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => setVoiceReplies((current) => !current)}
              aria-label={voiceReplies ? "Mute spoken replies" : "Enable spoken replies"}
              className={`rounded-full border px-3 py-2 text-xs ${
                voiceReplies ? "border-accent bg-accent-soft" : "border-line text-ink-faint"
              }`}
            >
              {voiceReplies ? "🔊" : "🔇"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
