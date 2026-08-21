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
    <section className="animate-rise flex flex-col gap-2 rounded-xl border border-accent bg-paper-raised p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
          Results for {query}
        </h2>
        <button type="button" onClick={onDismiss} className="text-xs text-ink-faint hover:text-ink">
          Close
        </button>
      </div>

      {results.length === 0 && <p className="py-2 text-sm text-ink-soft">Nothing matched that.</p>}

      <ul className="flex flex-col divide-y divide-line">
        {results.map((product) => (
          <li key={product.id} className="flex items-center gap-3 py-2">
            <div className="flex-1">
              <p className="text-sm">{product.name}</p>
              <p className="text-xs text-ink-faint">
                {product.size}
                {product.organic && " · organic"}
                {product.onSale && " · on sale"}
                {!product.inStock && " · out of stock"}
              </p>
            </div>
            <span className="text-sm font-medium">₹{product.price}</span>
            <button
              type="button"
              onClick={() => onAdd(product)}
              disabled={!product.inStock}
              className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-white disabled:bg-line"
            >
              Add
            </button>
          </li>
        ))}
      </ul>

      {substitutes.length > 0 && (
        <div className="border-t border-line pt-2">
          <p className="mb-2 text-xs text-ink-soft">Out of stock — try instead:</p>
          <div className="flex flex-wrap gap-2">
            {substitutes.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onAddSubstitute(name)}
                className="rounded-full border border-line px-3 py-1 text-sm capitalize hover:border-accent hover:bg-accent-soft"
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