import { useEffect, useState } from "react";
import type { DropStore } from "./dropStore";
import {
  formatDuration,
  formatReadyDate,
  toDatetimeLocalValue,
  useCountdown,
} from "./useCountdown";

type TimerCardProps = {
  storageKey: string;
  name: string;
  image: string;
  cooldownHours: number;
  accent: string;
  store: DropStore;
  now: () => number;
};

export function TimerCard({
  storageKey,
  name,
  image,
  cooldownHours,
  accent,
  store,
  now,
}: TimerCardProps) {
  const [readyAt, setReadyAt] = useState<number | null>(() => store.get(storageKey));
  const [isEditing, setIsEditing] = useState(false);
  const [draftDate, setDraftDate] = useState("");

  const remaining = useCountdown(readyAt, now);
  const isReady = readyAt !== null && remaining === 0;

  useEffect(() => {
    store.set(storageKey, readyAt);
  }, [readyAt, storageKey, store]);

  const isRunning = readyAt !== null && !isReady;
  const collect = () => setReadyAt(now() + cooldownHours * 3600 * 1000);
  const reset = () => setReadyAt(null);

  const openEditor = () => {
    setDraftDate(toDatetimeLocalValue(readyAt ?? now() + cooldownHours * 3600 * 1000));
    setIsEditing(true);
  };

  const confirmEditor = () => {
    const timestamp = new Date(draftDate).getTime();
    if (!Number.isNaN(timestamp)) setReadyAt(timestamp);
    setIsEditing(false);
  };

  return (
    <div
      role="group"
      aria-label={name}
      className="relative flex flex-col items-center gap-4 rounded-2xl border p-6 text-center backdrop-blur-sm transition-shadow"
      style={{
        borderColor: isReady ? accent : "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        boxShadow: isReady ? `0 0 24px ${accent}55` : undefined,
      }}
    >
      <button
        type="button"
        onClick={openEditor}
        aria-label={`Set ${name} availability manually`}
        className="absolute top-3 left-3 flex h-6 w-6 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {readyAt !== null && !isEditing && (
        <button
          type="button"
          onClick={reset}
          aria-label={`Reset ${name} timer`}
          className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full text-red-500/70 transition-colors hover:bg-red-500/10 hover:text-red-500"
        >
          ✕
        </button>
      )}

      <div
        className="flex h-20 w-20 items-center justify-center rounded-full p-3"
        style={{ background: `${accent}22`, border: `1px solid ${accent}66` }}
      >
        <img src={image} alt={name} className="h-full w-full object-contain drop-shadow-md" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">{name}</h2>
        <p className="text-sm text-white/40">Recharges in {cooldownHours}h</p>
      </div>

      {isEditing ? (
        <div className="flex w-full flex-col items-center gap-2">
          <input
            type="datetime-local"
            value={draftDate}
            onChange={(e) => setDraftDate(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white scheme-dark"
          />
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex-1 rounded-xl bg-white/8 px-4 py-2 font-medium text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmEditor}
              className="flex-1 rounded-xl px-4 py-2 font-medium transition-colors"
              style={{ background: accent, color: "#0a0716" }}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <div
              className="font-mono text-3xl tabular-nums"
              style={{ color: isReady ? accent : "#e9e6f5" }}
            >
              {isReady ? "Ready!" : remaining === null ? "--:--:--" : formatDuration(remaining)}
            </div>
            {isRunning && readyAt !== null && (
              <p className="mt-1 text-sm text-white/50">{formatReadyDate(readyAt)}</p>
            )}
          </div>

          <button
            type="button"
            onClick={collect}
            disabled={isRunning}
            className="w-full rounded-xl px-4 py-2 font-medium transition-colors disabled:cursor-not-allowed"
            style={{
              background: isReady ? accent : "rgba(255,255,255,0.08)",
              color: isReady ? "#0a0716" : "#e9e6f5",
              opacity: isRunning ? 0.4 : 1,
            }}
          >
            {readyAt === null ? "Start timer" : "Collected"}
          </button>
        </>
      )}
    </div>
  );
}
