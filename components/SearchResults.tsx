"use client";

import type { CatalogProduct } from "@/types";

interface SearchResultsProps {
  query: string;
  results: CatalogProduct[];
  substitutes: string[];
  onAdd: (product: CatalogProduct) => void;
  onAddSubstitute: (name: string) => void;
  onDismiss: () => void;
}

export function SearchResults({
  query,
  results,
  substitutes,
  onAdd,
  onAddSubstitute,
  onDismiss,
}: SearchResultsProps) {
  return (
    <section className="animate-row border border-ink bg-card">
      <header className="flex items-baseline justify-between border-b border-rule px-3 py-2">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
          {query} · {results.length} found
        </h2>
        <button type="button" onClick={onDismiss} className="font-mono text-[10px] text-faint hover:text-ink">
          close
        </button>
      </header>

      {results.length === 0 && (
        <p className="px-3 py-4 text-sm text-muted">Nothing matched. Try a wider price range.</p>
      )}

      <ul className="divide-y divide-rule/60">
        {results.map((product) => (
          <li key={product.id} className="flex items-baseline gap-2 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{product.name}</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
                {product.size}
                {product.organic && " · organic"}
                {product.onSale && " · sale"}
                {!product.inStock && " · out of stock"}
              </p>
            </div>
            <span className="font-mono text-sm tabular-nums">₹{product.price}</span>
            <button
              type="button"
              onClick={() => onAdd(product)}
              disabled={!product.inStock}
              className="border border-ink px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors hover:bg-ink hover:text-card disabled:border-rule disabled:text-faint disabled:hover:bg-transparent disabled:hover:text-faint"
            >
              add
            </button>
          </li>
        ))}
      </ul>

      {substitutes.length > 0 && (
        <div className="border-t border-rule px-3 py-2.5">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">
            Out of stock — try
          </p>
          <div className="flex flex-wrap gap-1.5">
            {substitutes.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onAddSubstitute(name)}
                className="border border-rule px-2 py-1 text-sm capitalize hover:border-ink"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}