import { Fragment, useState } from "react";
import {
  Bar,
  Lockable,
  StarBaseControl,
  Stepper,
  StatusBadges,
  TodoFilter,
  usePlanner,
  type PlannerApi,
} from "./controls";
import {
  CATEGORIES,
  COLONIES,
  formatCost,
  formatDuration,
  parseDuration,
  percent,
  progressAgainst,
  sortSuggestions,
  stepInfo,
  suggestionsFor,
  type SortMode,
  type Suggestion,
} from "./plannerModel";

const COLLAPSED_COUNT = 5;

function suggestionLabel(s: Suggestion): string {
  const times = s.count > 1 ? ` x${s.count}` : "";
  if (s.kind === "build") return `Build ${s.type.name}${times}`;
  return `Upgrade ${s.type.name}${times}, level ${s.fromLevel} to ${s.toLevel}`;
}

function NextSteps({ api }: { api: PlannerApi }) {
  const [sort, setSort] = useState<SortMode>("category");
  const [expanded, setExpanded] = useState(false);
  const all = sortSuggestions(suggestionsFor(api.allRows), sort);
  const shown = expanded ? all : all.slice(0, COLLAPSED_COUNT);

  const apply = (s: Suggestion) => {
    const colony = api.colony.id;
    const row = api.allRows.find((r) => r.type.id === s.type.id)!;
    if (s.kind === "build") {
      api.dispatch({ kind: "count", colony, type: s.type.id, value: row.owned + 1 });
      return;
    }
    const index = row.levels.findIndex((l) => l === s.fromLevel);
    api.dispatch({ kind: "level", colony, type: s.type.id, index, value: s.toLevel });
  };

  return (
    <section className="mb-5 rounded-xl border border-white/10 bg-white/4 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">
          Next steps <span className="font-normal text-white/40">({all.length})</span>
        </h3>
        <label className="flex items-center gap-2 text-xs text-white/50">
          Order
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-white"
          >
            <option value="category">By category</option>
            <option value="fastest">Fastest first</option>
            <option value="cheapest">Cheapest first</option>
          </select>
        </label>
      </div>

      {all.length === 0 && <p className="text-sm text-emerald-300">Everything is maxed.</p>}
      <ul className="divide-y divide-white/5">
        {shown.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-3 py-1.5 text-sm">
            <span className="min-w-0 flex-1 truncate text-white/80">{suggestionLabel(s)}</span>
            <span className="hidden shrink-0 text-xs text-white/40 sm:inline">
              {formatDuration(s.seconds)}, {formatCost(s.cost)}
            </span>
            <button
              type="button"
              aria-label={`Done: ${suggestionLabel(s)}`}
              onClick={() => apply(s)}
              className="shrink-0 rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
            >
              Done
            </button>
          </li>
        ))}
      </ul>

      {all.length > COLLAPSED_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs text-violet-300 hover:text-violet-200"
        >
          {expanded ? "Show fewer" : `Show ${all.length - COLLAPSED_COUNT} more`}
        </button>
      )}
    </section>
  );
}

function ColonyTabs({ api }: { api: PlannerApi }) {
  return (
    <div role="tablist" aria-label="Colonies" className="mb-4 flex flex-wrap gap-1">
      {COLONIES.map(({ id, name }) => {
        const locked = !api.unlockedIds.has(id);
        const active = id === api.colony.id;
        const pct = percent(progressAgainst(api.rowsOf(id), api.state[id].starBase));
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => api.setColonyId(id)}
            className="w-24 rounded-lg px-2 py-1.5 text-left text-sm font-medium"
            style={{
              background: active ? "rgba(255,255,255,0.12)" : "transparent",
              color: active
                ? "#e9e6f5"
                : locked
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(255,255,255,0.5)",
            }}
          >
            <span className="flex justify-between">
              <span>{name}</span>
              {locked && <span>🔒</span>}
            </span>
            <span className="mt-1 block">
              <Bar pct={locked ? 0 : pct} height="h-1" />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function BuildingsTable({ api }: { api: PlannerApi }) {
  const { colony, dispatch } = api;
  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr className="text-white/40">
          <th className="border-b border-white/10 py-2 pr-4 font-medium">Building</th>
          <th className="border-b border-white/10 py-2 pr-4 font-medium">Owned / Max</th>
          <th className="border-b border-white/10 py-2 pr-4 font-medium">Levels (max)</th>
          <th className="border-b border-white/10 py-2 font-medium">Status</th>
        </tr>
      </thead>
      <tbody>
        {CATEGORIES.map((category) => {
          const rows = api.rows.filter((r) => r.type.category === category);
          if (rows.length === 0) return null;
          return (
            <Fragment key={category}>
              <tr>
                <td colSpan={4} className="pt-4 pb-1 text-xs font-semibold text-white/30 uppercase">
                  {category}
                </td>
              </tr>
              {rows.map((row) => (
                <tr key={row.type.id} className={row.locked ? "text-white/30" : "text-white/80"}>
                  <td className="border-b border-white/5 py-2 pr-4">{row.type.name}</td>
                  <td className="border-b border-white/5 py-2 pr-4 whitespace-nowrap">
                    <Stepper
                      label={`${row.type.name} count`}
                      value={row.owned}
                      min={0}
                      max={Math.max(row.maxCount, row.owned)}
                      onChange={(value) =>
                        dispatch({ kind: "count", colony: colony.id, type: row.type.id, value })
                      }
                    />
                    <span className="ml-2 text-white/40">/ {row.maxCount}</span>
                  </td>
                  <td className="border-b border-white/5 py-2 pr-4">
                    <span className="flex flex-wrap items-center gap-2">
                      {row.levels.map((level, index) => {
                        const next = stepInfo(row.type, level + 1);
                        const title =
                          level >= row.maxLevel || !next
                            ? "Nothing left to upgrade here"
                            : `Level ${level + 1}: ${formatDuration(parseDuration(next.time))}, ${formatCost(next.cost)}`;
                        return (
                          <Stepper
                            key={index}
                            size="sm"
                            label={`${row.type.name} ${index + 1} level`}
                            title={title}
                            value={level}
                            min={1}
                            max={Math.max(row.maxLevel, level)}
                            onChange={(value) =>
                              dispatch({
                                kind: "level",
                                colony: colony.id,
                                type: row.type.id,
                                index,
                                value,
                              })
                            }
                          />
                        );
                      })}
                      {row.owned > 0 && <span className="text-white/40">/ {row.maxLevel}</span>}
                    </span>
                  </td>
                  <td className="border-b border-white/5 py-2">
                    <StatusBadges row={row} />
                  </td>
                </tr>
              ))}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

export function PlannerPrototype() {
  const api = usePlanner();

  return (
    <section className="w-full flex-1 rounded-2xl border border-dashed border-white/15 p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-white">Planner</h2>
        <span className="text-sm text-white/40">
          PROTOTYPE issue 3, in-memory data, wiki data in data/galaxyLifeBuildings.json
        </span>
      </div>

      <ColonyTabs api={api} />

      <Lockable api={api}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <StarBaseControl api={api} />
        </div>
        <NextSteps api={api} />
        <div className="mb-3 flex justify-end">
          <TodoFilter api={api} />
        </div>
        <BuildingsTable api={api} />
      </Lockable>
    </section>
  );
}
