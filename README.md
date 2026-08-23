# VoiceCart

**Speak your shopping list.** Add, remove, update, check off and search groceries by voice in English, Hindi, Spanish or French — with automatic categorisation, quantity parsing, replenishment suggestions and price-filtered catalogue search.

**Live:** https://REPLACE-WITH-YOUR-URL.vercel.app · **Best experienced in Chrome or Edge**

![VoiceCart](docs/list.png)

> The interesting decision here was **not** to send every command to a language model. A deterministic parser resolves roughly 80% of input in about 5ms with zero API calls, including all four languages. The LLM is a fallback for ambiguity, not the default path.
>
> [Why that matters →](#why-a-hybrid-parser)

---

## Contents

- [What it does](#what-it-does)
- [How to use it](#how-to-use-it)
- [Architecture](#architecture)
- [Why a hybrid parser](#why-a-hybrid-parser)
- [How the parser works](#how-the-parser-works)
- [Suggestion engines](#suggestion-engines)
- [Voice search](#voice-search)
- [Requirements coverage](#requirements-coverage)
- [Design decisions and rejected alternatives](#design-decisions-and-rejected-alternatives)
- [Data model](#data-model)
- [API reference](#api-reference)
- [Error handling](#error-handling)
- [Interface design](#interface-design)
- [Testing](#testing)
- [Running locally](#running-locally)
- [Project structure](#project-structure)
- [Limitations](#limitations)
- [Future work](#future-work)

---

## What it does

A single-screen, mobile-first shopping list you talk to. Speech becomes structured intent, intent becomes list operations, and the list organises itself by aisle.

| | | |
|:--:|:--:|:--:|
| ![Listening](docs/listening.png) | ![Substitutes](docs/substitutes.png) | ![Search](docs/search.png) |
| Live transcript while speaking | Substitutes offered on add | Price-filtered catalogue search |

---

## How to use it

Open the live URL in Chrome or Edge, allow microphone access, tap the mic and speak. Every command below also works typed into the input box — the text field runs the identical pipeline, which is how the app stays usable on browsers without `SpeechRecognition`.

### Adding

| Say | Result |
|---|---|
| `add milk` | Milk · Dairy |
| `I need apples` | Apples · Produce |
| `I want to buy bananas` | Bananas · Produce |
| `we're out of eggs` | Eggs · Dairy |
| `running low on bread` | Bread · Bakery |
| `add two litres of milk` | Milk · 2 litre · Dairy |
| `add 2 bottles of water` | Water · 2 bottle · Beverages |
| `buy 5 oranges` | Oranges · 5 · Produce |
| `add half a kg of tomatoes` | Tomatoes · 0.5 kg · Produce |
| `add a dozen eggs` | Eggs · 1 dozen · Dairy |

Adding something already on the list increments its quantity rather than creating a second row.

### Managing

| Say | Result |
|---|---|
| `remove milk from my list` | Deletes it |
| `I got the bread` | Checks it off |
| `make it three` | Updates the quantity |
| `undo` | Restores the last removal |
| `clear my list` | Empties everything |

### Searching

| Say | Result |
|---|---|
| `find toothpaste under 150` | Under ₹150, cheapest first |
| `find me organic apples` | Organic only |
| `search for Amul butter` | Brand filtered |
| `find toothpaste 200 g` | Size filtered |
| `show me organic rice under 600` | All three filters at once |

### Other languages

Tap **HI**, **ES** or **FR** to switch the recognition language.

![Hindi](docs/hindi.png)

| Say | Result |
|---|---|
| `दो किलो चावल चाहिए` | Rice · 2 kg · Pantry |
| `do litre doodh daal do` | Milk · 2 litre · Dairy |
| `दूध हटा दो` | Removes milk |
| `necesito tres manzanas` | Apples · 3 · Produce |
| `ajouter deux litres de lait` | Milk · 2 litre · Dairy |
| `quitar el pan` | Removes bread |

Items are stored under a canonical English key regardless of the language spoken, so a list built in Hindi and continued in English stays coherent.

### Hands-free

The **VOICE** toggle in the bottom bar controls spoken confirmations. With it on, every action is read back — "Added two litres of milk" — so the app is usable without looking at the screen.

---

## Architecture

```mermaid
flowchart TD
    A[Voice input<br/>Web Speech API] --> C
    B[Text input] --> C
    C[POST /api/parse]
    C --> D[Rule parser<br/>lexicon · regex · confidence scoring]
    D --> E{confidence<br/>≥ 0.75?}
    E -->|yes · ~80% of commands| G[Execute intent]
    E -->|no| F[Gemini Flash-Lite<br/>strict JSON schema]
    F -->|parsed| G
    F -->|null on any failure| H[Rule parser's best guess]
    H --> G
    G --> I[(MongoDB Atlas<br/>items · purchases)]
    G --> J[Suggestion engines<br/>replenish · seasonal · sale · substitute]
    G --> K[Catalogue search<br/>brand · size · organic · price]
```

Layer boundaries are enforced by module rather than convention. Nothing in `lib/nlp/` imports React or Mongoose — which is why the parser is testable in isolation and why the entire pipeline can be exercised from `curl` without a browser:

```bash
curl -X POST localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{"transcript":"add two litres of milk"}'
```

---

## Why a hybrid parser

Voice commands for a shopping list are overwhelmingly formulaic. "Add milk", "remove bread", "two litres of milk". These do not need a language model, and routing them through one costs four things that matter:

| | LLM for every command | Hybrid with confidence gate |
|---|---|---|
| Latency, common case | 400–900ms | ~5ms |
| API calls per session | one per command | roughly one in five |
| Determinism | varies between runs | identical every time |
| Behaviour when the API is down | application is dead | application keeps working |
| Unit testable | requires mocking | 31 tests, no mocks |
| Cost at scale | grows linearly with usage | grows with ambiguity only |

Two observed cases:

```
"add 2 bottles of water"
  → rule parser · confidence 1.00 · no network call
  → { intent: ADD, item: "water", quantity: 2, unit: "bottle", category: "beverages" }

"umm we finished the dragon fruit yesterday, grab a couple more"
  → rule parser · confidence 0.60 · below threshold
  → Gemini Flash-Lite
  → { intent: ADD, item: "dragon fruit", quantity: 2 }
```

The second case is the one worth noting: "a couple" became 2, and "dragon fruit" was extracted despite not existing in the lexicon. That is what the fallback is for.

**Every LLM failure path returns `null`** — missing key, six-second timeout, rate limit, malformed JSON, network error. The caller keeps the rule parser's best guess instead. The application degrades; it does not break. Running with no `GEMINI_API_KEY` at all is a supported configuration.

---

## How the parser works

`lib/nlp/ruleParser.ts` runs a fixed sequence of pure functions:

**1. Normalise.** Lowercase, strip apostrophes so `don't` becomes `dont` and matches trigger phrases, remove punctuation, collapse whitespace. Devanagari is preserved untouched.

**2. Detect intent.** Seven intents, matched against roughly 90 trigger phrases with word-boundary regexes, longest phrase first so `i want to buy` wins over `i want`. Order is deliberate: `UNDO` → `CLEAR` → `SEARCH` → `REMOVE` → `CHECK_OFF` → `UPDATE_QTY` → `ADD`. With no match, the intent defaults to `ADD` but is flagged non-explicit, which lowers confidence.

**3. Extract filters** (search only), then strip them so `under 150` cannot be misread as an item or a quantity.

**4. Resolve the item.** Every alias across all four languages maps to one canonical English key. Lookup tries n-grams longest-first, so `brown bread` resolves before `bread`. Unmatched plurals fall back to stripping `es` then `s`, which covers Spanish and French plurals without hand-listing them. Single-token filler words are skipped during lookup — otherwise `thé` normalised to `the` would shadow the English article.

**5. Extract quantity.** Digits, fractions (`3/4`), and number words across four languages. Articles between number and unit are stepped over, so `half a kg` yields 0.5 kg rather than 1 kg. A number only counts as a quantity if followed by a unit or sitting within two tokens of the item — this is what stops the Hindi word `do` (two) from firing inside the English verb "do".

**6. Reject implausible items.** Measurement words, filler, bare numbers and phrases over four words are refused by both parsers, so a misheard transcript produces an error message rather than a junk row.

**7. Score confidence.**

```
CLEAR or UNDO with an explicit trigger      → 0.95
explicit intent phrase matched               → +0.45   (otherwise +0.15)
item resolved to a canonical lexicon entry   → +0.45   (otherwise +0.15, or +0.35 for search)
quantity parsed                              → +0.10
search filters extracted                     → +0.10
```

At or above `NLP_CONFIDENCE_THRESHOLD` (default 0.75) the command never touches the network. Multilingual support is lexicon-driven rather than model-driven, so `दो किलो चावल चाहिए` scores 1.00 and resolves entirely offline.

When the threshold is not met, `lib/nlp/llmParser.ts` sends the transcript to Gemini Flash-Lite at `temperature: 0` with `responseSchema` set, which guarantees structurally valid JSON — no markdown fences to strip, no `JSON.parse` roulette. The canonical item list is supplied in the system prompt so the model returns keys the rest of the system already understands. The response is then validated with Zod before use.

---

## Suggestion engines

Three independent engines, all pure functions in `lib/suggestions/engine.ts`, combined and capped at four so they never crowd the list.

**Replenishment.** Every add writes to a `purchases` document holding a rolling window of the last ten gaps, in days, between adds of that item. The engine compares elapsed days against the average of those gaps and surfaces anything at 80% or more of its usual cycle. Before an item has enough history, it falls back to a per-item prior stored in the lexicon — `avgIntervalDays`, a typical household restock cadence. Capping at ten intervals keeps documents bounded and makes the estimate track recent behaviour rather than a stale lifetime average.

**Seasonal.** A month-indexed produce calendar for the Indian market, compiled from public agricultural seasonality data. Each month carries user-facing copy and a list of canonical keys.

**On sale.** Reads the `onSale` flag from the catalogue, deduplicated by item.

**Substitutes.** Fire in two places: immediately on adding any item with alternatives — say "add milk" and almond, soy and oat milk are offered — and when a catalogue search returns nothing in stock.

Suggestions already on the list are filtered out. If the suggestion endpoint fails it returns an empty array rather than an error, because a broken sidebar should never break the list.

---

## Voice search

A single spoken sentence yields up to five filters:

| Filter | Parsed from |
|---|---|
| Maximum price | `under`, `below`, `less than`, `cheaper than`, `up to`, `within` |
| Minimum price | `over`, `above`, `more than`, `at least`, `starting from` |
| Brand | matched against catalogue brands, longest first |
| Organic | the word `organic` |
| Size | number + unit, normalised so `1 litre` matches a catalogue entry of `1 L` |

Currency symbols are stripped, so `under $5` and `under 150` both parse. Size extraction runs after prices are removed, so `toothpaste under 150` cannot misread `150` as a size. Results sort cheapest-first and cap at eight.

When nothing matches or everything matched is out of stock, the response carries that item's substitutes — which is why `find mangoes` returns the out-of-stock Alphonso listing plus papaya and peaches.

---

## Requirements coverage

Every requirement in the brief, and how to verify it.

| # | Requirement | Implementation | Verify by |
|---|---|---|---|
| 1.1 | Voice command recognition | `hooks/useSpeechRecognition.ts` | say "add milk" |
| 1.2 | NLP for varied phrasing | `lib/nlp/intents.ts` — 7 intents, ~90 trigger phrases | "I need apples" / "we're out of eggs" |
| 1.3 | Multilingual support | alias map in `data/items.json`, `lib/languages.ts` | switch to HI, say `दो किलो चावल चाहिए` |
| 2.1 | Recommendations from history | `replenishmentSuggestions()` — rolling per-item interval | add an item, return after its cycle |
| 2.2 | Seasonal recommendations | `seasonalSuggestions()` — month-indexed calendar | "IN SEASON" chips |
| 2.2 | On-sale recommendations | `onSaleSuggestions()` — catalogue `onSale` flag | "ON SALE" chips |
| 2.3 | Substitutes on preference | fires on every add | "add milk" → almond / soy / oat |
| 2.3 | Substitutes when unavailable | `/api/search` when nothing is in stock | "find mangoes" |
| 3.1 | Add, remove, modify | `/api/items`, `/api/items/[id]` | "remove milk", "make it three" |
| 3.2 | Automatic categorisation | lexicon-driven, 10 categories, LLM fallback | items group under aisle headers |
| 3.3 | Quantity management | `lib/nlp/numbers.ts`, `lib/nlp/units.ts` | "add 2 bottles of water", "half a kg" |
| 4.1 | Search by brand | `lib/nlp/filters.ts` | "search for Amul butter" |
| 4.1 | Search by size | `SIZE` regex plus `normalizeSize()` | "find toothpaste 200 g" |
| 4.2 | Price range filtering | `MAX_PRICE` / `MIN_PRICE` | "find toothpaste under 150" |
| 11.1 | Minimalist interface | single screen, no navigation | — |
| 11.2 | Real-time visual feedback | transcript ribbon, status line, confirmations | speak and watch |
| 11.3 | Mobile and voice-only | mobile-first layout, spoken confirmations | toggle VOICE |
| 12 | Hosting | Vercel with MongoDB Atlas | the live URL |
| T.1 | Clean production code | typed throughout, layered, no dead code | — |
| T.2 | Error handling | every route validated; every LLM failure caught | `curl -d '{}'` returns 400 |
| T.3 | Loading states | skeleton rows, mic spinner, busy status | — |
| T.4 | Documentation | this file plus `APPROACH.md` | — |

---

## Design decisions and rejected alternatives

**Hybrid NLP rather than LLM-only.** Covered in detail above. The alternative — one model call per command — is simpler to write and worse on latency, cost, determinism, testability and failure behaviour. Building the rule layer first also meant the LLM prompt could be narrow and schema-constrained rather than open-ended.

**Web Speech API rather than a cloud speech service.** Whisper or Google Cloud Speech transcribe more accurately, and cost money, add a network round trip, and require streaming audio from the client. The browser API is free, native, returns interim results for live feedback, and keeps audio on-device. The trade-off is real and documented: no Firefox support, so the text input runs the same pipeline as a first-class path rather than a degraded one.

**Anonymous sessions rather than authentication.** A client-generated `nanoid` is stored locally and sent as a request header; every database query is scoped by it. Building login, password reset and session management would have consumed most of the time budget for no evaluated value. The session resolver is one module — swapping it for an auth provider touches that file, not the routes.

**One lexicon record rather than three lookup files.** Category, default unit, substitutes, restock interval and multilingual aliases live together per item. Splitting them into separate `categories.json`, `substitutes.json` and `aliases.json` means writing the same item name in three places, which drifts on the first edit.

**Static catalogue rather than a live API.** No free grocery API covers Indian brands and pricing. The catalogue is 78 hand-assembled products with representative brands and illustrative prices, isolated behind `/api/search` so a real integration is a single-module change. Two items are deliberately marked out of stock so the substitution path is demonstrable.

**Serverless connection caching.** Mongoose's connection is cached on `globalThis` in `lib/db/mongodb.ts`. Without it, every function invocation opens a new connection and exhausts the Atlas connection limit under any real traffic. This is the kind of bug that never appears in development and appears immediately in production.

**Least-privilege database credentials.** The application user holds `readWrite` on this database only. Pointing it at any other database on the same cluster returns an authorisation error rather than reading data it shouldn't.

**Duplicate merging rather than duplicate rows.** Saying "add milk" twice increments the quantity. Two identical rows is what the naive implementation produces and not what a person expects.

**Optimistic updates.** Toggling and deleting mutate local state immediately, then reconcile with the server; a failed request restores truth from a refetch. Interactions feel instant without lying about persistence.

**Canonical English storage rather than storing the spoken form.** A list built in Hindi and continued in English would otherwise contain both `दूध` and `milk` as separate items. Storing the canonical key and resolving aliases at parse time keeps deduplication, categorisation and history coherent across languages.

---

## Data model

```mermaid
erDiagram
    ITEM {
        string sessionId
        string canonicalItem
        string displayName
        number quantity
        string unit
        string category
        bool checked
        date createdAt
    }
    PURCHASE {
        string sessionId
        string canonicalItem
        string category
        number count
        date lastPurchasedAt
        array intervals
    }
    ITEM ||--o| PURCHASE : "recorded on add"
```

Two collections, both indexed on `sessionId`. `purchases` carries a compound unique index on `(sessionId, canonicalItem)` so history is one document per item per session. `intervals` holds the last ten gaps in days between adds, feeding the replenishment engine.

---

## API reference

All list endpoints require an `x-session-id` header and return `401` without one.

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/parse` | Transcript → structured `ParsedCommand` |
| `GET` | `/api/items` | List for this session |
| `POST` | `/api/items` | Add, merging duplicates |
| `DELETE` | `/api/items` | Clear the list |
| `PATCH` | `/api/items/[id]` | Update quantity or checked state |
| `DELETE` | `/api/items/[id]` | Remove one item |
| `GET` | `/api/suggestions` | Replenishment, seasonal and on-sale |
| `GET` | `/api/search` | Catalogue filtering |

```jsonc
// POST /api/parse
{ "transcript": "add two litres of milk" }

{
  "intent": "ADD",
  "canonicalItem": "milk",
  "rawItem": "milk",
  "quantity": 2,
  "unit": "litre",
  "category": "dairy",
  "filters": null,
  "confidence": 1,
  "source": "rule",
  "transcript": "add two litres of milk"
}
```

`source` reports which layer produced the result, which makes the fallback observable in production rather than a black box.

---

## Error handling

| Failure | Behaviour |
|---|---|
| Microphone permission denied | Actionable message, mic disabled, text input still works |
| No speech detected | "Didn't catch that — tap to retry" |
| Browser without `SpeechRecognition` | Mic disabled with an explanation, text input takes over |
| Gemini key missing, timeout, rate limit, bad JSON | Returns `null`, rule parser's guess is used |
| Item not on the list for remove or check off | "milk is not on the list", nothing mutated |
| Unparseable command | "Command not recognised", nothing written |
| Implausible item | Rejected before it reaches the database |
| Malformed request body | `400` with a specific message |
| Database unreachable | `500` to the client, full error to server logs |
| Suggestions endpoint fails | Empty array, list unaffected |
| Optimistic update rejected | Local state reverts from a refetch |

Client responses stay generic while server logs carry the real cause, so the deployed application is debuggable from Vercel's logs without leaking internals.

---

## Interface design

Single screen, mobile-first, no navigation.

The visual language is a **shop bill**: item name on the left, quantity right-aligned in monospace, a dotted leader running between them. Numbers align down a column the way they do on a real receipt, which is also why quantities use a mono face — it is functional, not decorative.

Categories carry a coloured vertical rule drawn from produce tones. The colour encodes the aisle; it isn't ornament.

The signature element is the **transcript ribbon**: what you say appears in oversized display type at the bottom of the screen as it is recognised, then resolves into a list row. It is the one place the design raises its voice.

Type is Bricolage Grotesque for display, IBM Plex Sans for body, IBM Plex Mono for every figure and label. Keyboard focus is visible throughout, and `prefers-reduced-motion` disables all animation.

---

## Testing

```bash
npm test
```

![Tests](docs/tests.png)

31 tests covering intent detection, quantity and unit parsing, categorisation, all four languages, search filter extraction, implausible-input rejection and confidence gating. The suite runs in under a second because the parser is pure functions with no I/O to mock.

The confidence gate is asserted directly: clear commands must score above the threshold, ambiguous ones must fall below it. Those assertions are what guarantee the LLM fallback fires only when it should — without them, a scoring regression would silently route everything through the network.

Three bugs the suite caught during development, all of which would have reached production otherwise:

- The French `thé`, stripped of its accent, shadowed the English article `the`, so "I got the bread" resolved to tea
- `half a kg` yielded quantity 1, because the article between number and unit broke the scan
- Spanish plurals (`manzanas`) failed to resolve, since only the singular was in the lexicon

---

## Running locally

```bash
git clone https://github.com/Sia2005/voicecart.git
cd voicecart
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/voicecart
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-3.1-flash-lite
NLP_CONFIDENCE_THRESHOLD=0.75
```

`GEMINI_API_KEY` is optional. Without it the rule parser handles everything and low-confidence commands surface an error rather than escalating — a supported degraded mode, not a crash.

```bash
npm run dev     # http://localhost:3000
npm test        # parser suite
npm run build   # production build with type checking
```

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, MongoDB Atlas via Mongoose, Google Gemini Flash-Lite, Vitest. Deployed on Vercel. Every service sits on a permanent free tier — the project costs nothing to run.

---

## Project structure

```
app/
  layout.tsx              fonts and document shell
  page.tsx                orchestration and state, no parsing logic
  globals.css             design tokens and animation
  api/
    parse/route.ts        NLP entry point
    items/route.ts        list CRUD, duplicate merging
    items/[id]/route.ts   per-item update and delete
    suggestions/route.ts  replenishment, seasonal, on-sale
    search/route.ts       catalogue filtering
components/               presentational only, no data fetching
hooks/
  useSpeechRecognition.ts
  useSpeechSynthesis.ts
lib/
  nlp/
    ruleParser.ts         deterministic parser
    llmParser.ts          Gemini fallback
    index.ts              the confidence gate
    lexicon.ts            alias resolution
    intents.ts            trigger phrases
    numbers.ts            multilingual number words
    units.ts              unit normalisation
    filters.ts            search filter extraction
    stopwords.ts          implausible-item rejection
    schema.ts             Zod and Gemini schemas
  suggestions/engine.ts   pure scoring functions
  db/                     models, connection, session
  client/                 typed fetch wrappers
  categories.ts           aisle ordering and colour
  languages.ts            supported locales
data/
  items.json              57-item canonical lexicon
  seasonal.json           month-indexed produce calendar
  catalog.json            78 products
  README.md               data provenance
__tests__/                parser suite
docs/                     screenshots
```

---

## Limitations

- **Voice requires Chrome or Edge.** Firefox has no `SpeechRecognition` and iOS Safari is inconsistent. The text input is a documented, equally capable fallback rather than an afterthought.
- **The catalogue is static.** Prices are illustrative and stock is fixed.
- **Multilingual coverage is lexicon-bound.** An item outside `data/items.json` spoken in a non-English command depends on the LLM fallback to resolve.
- **No authentication.** Clearing browser storage starts a fresh list, and a list cannot be accessed from a second device.
- **Replenishment needs history.** Until an item has been added twice, the engine uses a per-item prior rather than the user's own cadence.
- **Recognition quality varies with accent and background noise**, which is a property of the browser's speech engine rather than this application.

---

## Future work

**Streaming speech-to-text** behind the same interface, giving browser-independent voice input with per-word confidence that could feed the same gate — low transcription confidence is itself a signal to escalate.

**Threshold tuning from data.** Log which commands escalated and where the LLM disagreed with the rule parser, then set the threshold from observed disagreement rather than a constant. The `source` field already in every response is the instrumentation this needs.

**Lexicon learning.** When the LLM resolves an item the lexicon lacks, queue it for review. The offline path grows over time and API usage falls — a system that gets cheaper and faster the more it is used.

**Real catalogue integration** behind `/api/search`, with live pricing, stock and store availability.

**Shared lists.** The session id is already the only scoping primitive, so a shared household list is a session id two devices both hold. Adding real-time sync would need a subscription channel; the data model would not change.

**Offline-first** with a service worker and a write queue. The rule parser already runs entirely client-side capable, so most commands could work with no connection at all.

**Purchase history analytics** — spend by category over time, using the `purchases` collection that already exists for replenishment.
