import { useState } from "react";

type NumberFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
  describedBy?: string;
};

const BUTTON_CLASS =
  "flex size-7 items-center justify-center rounded-md border border-white/15 text-sm text-white/80 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";

export function NumberField({ label, value, min, max, onCommit, describedBy }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft === null) return;
    const typed = Number(draft);
    setDraft(null);
    const accepted = draft.trim() !== "" && Number.isInteger(typed) && typed >= min && typed <= max;
    if (accepted && typed !== value) onCommit(typed);
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onCommit(value - 1)}
        className={BUTTON_CLASS}
      >
        -
      </button>
      <input
        type="number"
        aria-label={label}
        aria-describedby={describedBy}
        min={min}
        max={max}
        value={draft ?? String(value)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
        }}
        className="w-14 rounded-md border border-white/15 bg-[#120c24] px-2 py-1 text-center text-sm text-white"
      />
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onCommit(value + 1)}
        className={BUTTON_CLASS}
      >
        +
      </button>
      <span className="text-sm text-white/50">/ {max}</span>
    </span>
  );
}
