import type { DropStore } from "./dropStore";
import { formatDuration } from "./useCountdown";
import { useDropTimer } from "./useDropTimer";
import { GearIcon } from "./GearIcon";

type TimerChipProps = {
  storageKey: string;
  name: string;
  image: string;
  cooldownHours: number;
  accent: string;
  store: DropStore;
  now: () => number;
  onOpenAdvanced: () => void;
};

export function TimerChip({
  storageKey,
  name,
  image,
  cooldownHours,
  accent,
  store,
  now,
  onOpenAdvanced,
}: TimerChipProps) {
  const { readyAt, remaining, isReady, isRunning, collect } = useDropTimer(
    storageKey,
    cooldownHours,
    store,
    now,
  );

  return (
    <div
      role="group"
      aria-label={`${name} timer`}
      className="relative flex items-center gap-2.5 rounded-2xl border py-2.5 pr-3 pl-2.5"
      style={{
        borderColor: isReady ? accent : "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        boxShadow: isReady ? `0 0 18px ${accent}40` : undefined,
      }}
    >
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full p-1.5"
        style={{ background: `${accent}22`, border: `1px solid ${accent}66` }}
      >
        <img src={image} alt="" className="h-full w-full object-contain" />
      </div>

      <div className="flex min-w-[68px] flex-col">
        <span className="text-xs font-semibold text-white">{name}</span>
        <span
          className="font-mono text-sm tabular-nums"
          style={{ color: isReady ? accent : isRunning ? "#e9e6f5" : "rgba(255,255,255,0.3)" }}
        >
          {isReady ? "Ready!" : remaining === null ? "--:--:--" : formatDuration(remaining)}
        </span>
      </div>

      <button
        type="button"
        onClick={collect}
        disabled={isRunning}
        aria-label={readyAt === null ? `Start ${name} timer` : `Collect ${name}`}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed"
        style={{
          background: isReady ? accent : "rgba(255,255,255,0.08)",
          color: isReady ? "#0a0716" : "#e9e6f5",
          opacity: isRunning ? 0.35 : 1,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M3 12a9 9 0 1 1 3 6.7" />
          <path d="M3 21v-6h6" />
        </svg>
      </button>

      <button
        type="button"
        onClick={onOpenAdvanced}
        aria-label={`Advanced settings for ${name}`}
        className="absolute -top-2 -right-2 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-white/10 bg-[#17132b] text-white/50 transition-colors hover:bg-white/10 hover:text-white/90"
      >
        <GearIcon className="h-3 w-3" />
      </button>
    </div>
  );
}
