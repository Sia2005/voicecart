"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MicButton } from "@/components/MicButton";
import { LanguagePicker } from "@/components/LanguagePicker";
import { CategoryList } from "@/components/CategoryList";
import { SuggestionChips } from "@/components/SuggestionChips";
import { SearchResults } from "@/components/SearchResults";
import { TranscriptRibbon } from "@/components/TranscriptRibbon";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { DEFAULT_LANGUAGE } from "@/lib/languages";
import { getItem } from "@/lib/nlp/lexicon";
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
  const [substitutes, setSubstitutes] = useState<Suggestion[]>([]);
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

      if (command.intent !== "ADD") setSubstitutes([]);

      switch (command.intent) {
        case "ADD": {
          if (!command.canonicalItem && !command.rawItem) {
            announce("error", "No item in that command.");
            return;
          }
          await createItem(command);
          announce("success", `Added ${label}`, `Added ${label}`);

          const record = command.canonicalItem ? getItem(command.canonicalItem) : null;
          setSubstitutes(
            record
              ? record.substitutes.slice(0, 3).map((name) => ({
                  kind: "substitute" as const,
                  item: name,
                  reason: `Alternative to ${label}`,
                  category: record.category,
                }))
              : []
          );
          break;
        }

        case "REMOVE": {
          const existing = findOnList(command);
          if (!existing) {
            announce("error", `${label} is not on the list.`, `${label} is not on your list`);
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
            announce("error", `${label} is not on the list.`);
            return;
          }
          await updateItem(existing._id, { checked: true });
          announce("success", `Checked off ${label}`, `Checked off ${label}`);
          break;
        }

        case "UPDATE_QTY": {
          const existing = findOnList(command);
          if (!existing || command.quantity === null) {
            announce("error", "Name the item and the new quantity.");
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
          announce("error", "Command not recognised.", "I did not understand that");
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
        announce("error", "Request failed. Try again.");
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
        setSubstitutes([]);
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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 pb-52 pt-6">
      <header className="flex items-start justify-between border-b border-ink pb-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">VoiceCart</h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
            {remaining} to buy
          </p>
        </div>
        <LanguagePicker value={language} onChange={setLanguage} />
      </header>

      {substitutes.length > 0 && (
        <SuggestionChips
          suggestions={substitutes}
          onAccept={handleSuggestion}
          onDismiss={() => setSubstitutes([])}
        />
      )}

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

      <div className="fixed inset-x-0 bottom-0 border-t border-ink bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex max-w-md flex-col gap-3 px-5 py-4">
          <TranscriptRibbon interim={interimTranscript} isBusy={isBusy} />

          {feedback && (
            <p
              role="status"
              className={`animate-row font-mono text-[11px] uppercase tracking-wider ${
                feedback.tone === "error"
                  ? "text-beet"
                  : feedback.tone === "success"
                    ? "text-pine"
                    : "text-muted"
              }`}
            >
              {feedback.message}
            </p>
          )}

          {errorMessage && (
            <p className="font-mono text-[11px] uppercase tracking-wider text-beet">
              {errorMessage}
            </p>
          )}

          <MicButton status={status} isBusy={isBusy} onStart={start} onStop={stop} />

          <div className="flex items-center gap-2">
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleTyped();
              }}
              placeholder="or type a command"
              className="flex-1 border-b border-rule bg-transparent px-1 py-1.5 text-sm outline-none placeholder:text-faint focus:border-ink"
            />
            <button
              type="button"
              onClick={() => setVoiceReplies((current) => !current)}
              aria-pressed={voiceReplies}
              aria-label={voiceReplies ? "Turn off spoken replies" : "Turn on spoken replies"}
              className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                voiceReplies ? "border-ink bg-ink text-card" : "border-rule text-faint"
              }`}
            >
              voice
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
