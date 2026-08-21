# VoiceCart

A voice-first shopping list manager. Speak in English, Hindi, Spanish or French
to add, remove, update, check off and search items. Built as a take-home project.

**Live:** https://your-stable-url.vercel.app
**Requires Chrome or Edge for voice** — the Web Speech API is unavailable in
Firefox and inconsistent in iOS Safari. A text input runs the identical parsing
pipeline for browsers without it.

## Try these

| Say | Result |
|---|---|
| add two litres of milk | Milk, 2 litre, Dairy |
| I need apples | Apples, Produce |
| we're out of eggs | Eggs, Dairy |
| add 2 bottles of water | Water, 2 bottle, Beverages |
| remove milk from my list | Deletes milk |
| I got the bread | Checks bread off |
| find toothpaste under 120 | Filtered catalog results |
| find me organic apples | Organic-only results |
| undo | Restores the last removal |
| दो किलो चावल चाहिए | Rice, 2 kg, Pantry |
| necesito tres manzanas | Apples, 3, Produce |
| ajouter deux litres de lait | Milk, 2 litre, Dairy |

## Architecture

    transcript
        │
        ├── Rule parser ── confidence ≥ 0.75 ──> execute
        │                        │
        │                   below 0.75
        │                        ↓
        └────────────── Gemini Flash-Lite (strict JSON schema)
                                 │
                            null on any failure
                                 ↓
                     fall back to rule parser's guess

Roughly 80% of commands resolve locally in ~5ms with no API call. The LLM is a
fallback for ambiguous phrasing, not the default path. Every LLM failure mode —
missing key, timeout, rate limit, malformed JSON — returns null, so the app
degrades instead of breaking.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS v4, MongoDB Atlas via
Mongoose, Google Gemini Flash-Lite, Vitest. Deployed on Vercel. Free tier
throughout.

## Structure

    app/
      page.tsx              single-screen UI
      api/
        parse/              NLP endpoint
        items/              list CRUD
        suggestions/        replenishment + seasonal
        search/             catalog search
    components/             presentational, no data fetching
    hooks/                  useSpeechRecognition, useSpeechSynthesis
    lib/
      nlp/                  ruleParser, llmParser, lexicon, numbers, units, filters
      suggestions/          scoring engines
      db/                   models, connection, session
      client/              typed fetch wrappers
    data/                   lexicon, seasonal calendar, catalog
    __tests__/              29 parser tests

## Features

**Voice input** — Web Speech API, four languages, live interim transcript,
spoken confirmations via SpeechSynthesis for eyes-free use.

**NLP** — intents ADD, REMOVE, UPDATE_QTY, CHECK_OFF, SEARCH, CLEAR, UNDO.
Quantities as digits, words, or fractions ("half a kg", "a dozen"). Units
normalised across aliases. Categories assigned from the lexicon.

**Suggestions** — replenishment scores each item's elapsed time against its
own rolling purchase interval, falling back to a per-item prior before history
exists. Seasonal suggestions come from a month-indexed produce calendar.
Substitutes surface when a searched item is out of stock.

**Search** — brand, size, organic and price-range filters parsed from speech.

## Design decisions

**No authentication.** Sessions are anonymous, keyed by a client-generated
nanoid sent as a header. Every database query is scoped by it. This kept the
8-hour budget on the actual problem; a real build would swap the session
resolver for an auth provider without touching the routes.

**Serverless connection caching.** `lib/db/mongodb.ts` caches the Mongoose
connection on `globalThis`. Without it every function invocation opens a new
connection and exhausts the Atlas connection cap.

**Least-privilege database user.** The application's credentials grant
`readWrite` on this database only.

**Duplicate merging.** Adding an existing item increments its quantity rather
than creating a second row.

**Optimistic updates.** Toggle and delete update local state immediately, then
reconcile with the server; a failed request restores truth from a refetch.

**Static catalog.** Product data is a committed JSON file, not a live API.
Prices are illustrative. Search is isolated behind `lib/catalog` so a real
catalog API would be a single-module change.

## Local setup

    git clone https://github.com/Sia2005/voicecart.git
    cd voicecart
    npm install
    cp .env.example .env.local

Fill in `.env.local`:

    MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/voicecart
    GEMINI_API_KEY=your_key
    GEMINI_MODEL=gemini-3.1-flash-lite
    NLP_CONFIDENCE_THRESHOLD=0.75

Then:

    npm run dev
    npm test

## Known limitations

- Voice input requires Chrome or Edge
- Catalog is static; prices are illustrative
- Multilingual coverage is lexicon-driven, so unlisted items in non-English
  input depend on the LLM fallback
- No authentication; clearing browser storage starts a new list
