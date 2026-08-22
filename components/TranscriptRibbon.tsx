"use client";

interface TranscriptRibbonProps {
  interim: string;
  isBusy: boolean;
}

export function TranscriptRibbon({ interim, isBusy }: TranscriptRibbonProps) {
  const text = interim || (isBusy ? "…" : "");

  if (!text) return null;

  return (
    <div className="animate-ribbon px-1 pb-1">
      <p className="font-display text-3xl font-semibold leading-tight tracking-tight text-ink">
        {text}
        <span className="ml-1 inline-block h-7 w-[3px] translate-y-1 animate-pulse bg-beet align-middle" />
      </p>
    </div>
  );
}