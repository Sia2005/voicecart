# Seed data

Three files back the NLP, suggestion and search engines. All are static and
version-controlled — no runtime scraping, no external API dependency.

## items.json
Canonical item lexicon. Each key is the canonical English item name; every
alias across English, Hindi (Devanagari + romanised), Spanish and French maps
back to it. This single record also carries the item's category, default unit,
substitute list and `avgIntervalDays`.

`avgIntervalDays` is a cold-start prior for the replenishment engine: before a
user has enough purchase history to compute their own interval, we fall back to
a typical household restock cadence.

**Design note:** category, substitutes and aliases deliberately live in one
record rather than three files. Three files means the same item name written in
three places, which drifts on the first edit.

## seasonal.json
Month-indexed produce availability for the Indian market, compiled from
publicly available agricultural seasonality calendars. `note` is user-facing
copy; `inSeason` references canonical keys from `items.json`.

## catalog.json
78 products across 10 categories, used only by voice search. Brands, sizes and
price points are representative of Indian online grocery retail (Amul, Tata,
Britannia, Aashirvaad and similar), assembled by hand for demonstration
purposes. **Prices are illustrative, not live** — a production build would
back this with a real catalogue API, which is why search is isolated behind
`lib/catalog/search.ts`.

`inStock: false` on a small number of items (p012, p029) is intentional: it
exercises the substitute-suggestion path during a demo.