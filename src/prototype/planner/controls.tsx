import { useMemo, useReducer, useState, type ReactNode } from "react";
import {
  COLONIES,
  MAX_STAR_BASE,
  initialState,
  reducer,
  rowsFor,
  unlocksAtStarBase,
  type Action,
  type ColonyData,
  type ColonyRef,
  type PlannerState,
  type Row,
} from "./plannerModel";

export type PlannerApi = {
  state: PlannerState;
  colony: ColonyRef;
  setColonyId: (id: string) => void;
  data: ColonyData;
  locked: boolean;
  unlockedIds: Set<string>;
  observatoryLevel: number;
  allRows: Row[];
  rows: Row[];
  onlyTodo: boolean;
  setOnlyTodo: (value: boolean) => void;
  dispatch: (action: Action) => void;
  rowsOf: (colonyId: string) => Row[];
};

export function usePlanner(): PlannerApi {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [colonyId, setColonyId] = useState("main");
  const [onlyTodo, setOnlyTodo] = useState(false);

  return useMemo(() => {
    const observatoryLevel = state.main.buildings.observatory?.[0] ?? 0;
    const unlockedIds = new Set(
      COLONIES.filter((c) => c.requires <= observatoryLevel).map((c) => c.id),
    );
    const colony = COLONIES.find((c) => c.id === colonyId)!;
    const allRows = rowsFor(colonyId, state[colonyId]);
    return {
      state,
      colony,
      setColonyId,
      data: state[colonyId],
      locked: !unlockedIds.has(colonyId),
      unlockedIds,
      observatoryLevel,
      allRows,
      rows: onlyTodo ? allRows.filter((r) => r.todo) : allRows,
      onlyTodo,
      setOnlyTodo,
      dispatch,
      rowsOf: (id) => rowsFor(id, state[id]),
    };
  }, [state, colonyId, onlyTodo]);
}

export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  title,
  size = "md",
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  title?: string;
  size?: "sm" | "md";
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null) {
      const parsed = Number.parseInt(draft, 10);
      if (!Number.isNaN(parsed)) onChange(parsed);
    }
    setDraft(null);
  };
  const pad = size === "sm" ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm";
  const inputWidth = size === "sm" ? "w-9 text-xs" : "w-12 text-sm";
  return (
    <span className="inline-flex items-center gap-1" title={title}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className={`${pad} rounded-md bg-white/10 text-white/80 hover:bg-white/20 disabled:opacity-30`}
      >
        -
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className={`${inputWidth} rounded-md border border-white/10 bg-black/30 py-1 text-center text-white`}
      />
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className={`${pad} rounded-md bg-white/10 text-white/80 hover:bg-white/20 disabled:opacity-30`}
      >
        +
      </button>
    </span>
  );
}

export function StatusBadges({ row }: { row: Row }) {
  if (row.locked && !row.over) {
    return (
      <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/40">
        Unlocks at Star Base {unlocksAtStarBase(row.type)}
      </span>
    );
  }
  const badges: ReactNode[] = [];
  if (row.over)
    badges.push(
      <span key="o" className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-300">
        Over limit
      </span>,
    );
  if (row.missing > 0)
    badges.push(
      <span key="m" className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
        Missing {row.missing}
      </span>,
    );
  if (row.below > 0)
    badges.push(
      <span key="b" className="rounded-full bg-sky-500/20 px-2 py-0.5 text-xs text-sky-300">
        Below limit {row.below}
      </span>,
    );
  if (badges.length === 0)
    badges.push(
      <span
        key="ok"
        className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300"
      >
        Maxed
      </span>,
    );
  return <span className="flex flex-wrap gap-1">{badges}</span>;
}

export function Lockable({ api, children }: { api: PlannerApi; children: ReactNode }) {
  if (!api.locked) return <>{children}</>;
  return (
    <div>
      <p className="mb-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
        Requires Observatory level {api.colony.requires} (currently {api.observatoryLevel}). Data is
        kept.
      </p>
      <div className="pointer-events-none opacity-40" aria-disabled="true">
        {children}
      </div>
    </div>
  );
}

export function TodoFilter({ api }: { api: PlannerApi }) {
  return (
    <label className="flex items-center gap-2 text-sm text-white/60">
      <input
        type="checkbox"
        checked={api.onlyTodo}
        onChange={(e) => api.setOnlyTodo(e.target.checked)}
      />
      Only what to upgrade
    </label>
  );
}

export function StarBaseControl({ api }: { api: PlannerApi }) {
  return (
    <span className="flex items-center gap-2 text-sm text-white/60">
      Star Base
      <Stepper
        label="Star Base level"
        value={api.data.starBase}
        min={1}
        max={MAX_STAR_BASE}
        onChange={(value) => api.dispatch({ kind: "starBase", colony: api.colony.id, value })}
      />
    </span>
  );
}

export function Bar({
  pct,
  tone = "violet",
  height = "h-1.5",
}: {
  pct: number;
  tone?: "violet" | "emerald" | "sky";
  height?: string;
}) {
  const color = { violet: "bg-violet-400", emerald: "bg-emerald-400", sky: "bg-sky-400" }[tone];
  return (
    <span className={`block w-full overflow-hidden rounded bg-white/10 ${height}`}>
      <span className={`block h-full rounded ${color}`} style={{ width: `${pct}%` }} />
    </span>
  );
}
