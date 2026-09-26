import { useCallback, useState, useSyncExternalStore } from "react";
import type { Catalog } from "../planner/catalog";
import { COLONIES, MAIN_COLONY_ID, type ColonyDefinition } from "../planner/colonies";
import type { ColonyStore } from "../store/colonyStore";

const DEFAULT_STAR_BASE_LEVEL = 1;
const OBSERVATORY_LEVEL_UNTRACKED = 0;

type PlannerProps = {
  store: ColonyStore;
  catalog: Catalog;
  now: () => number;
};

function isUnlocked(colony: ColonyDefinition): boolean {
  return colony.requiredObservatoryLevel <= OBSERVATORY_LEVEL_UNTRACKED;
}

function ColonyPanel({ colony, store, catalog, now }: PlannerProps & { colony: ColonyDefinition }) {
  const subscribe = useCallback(
    (onChange: () => void) => store.subscribe(colony.id, onChange),
    [store, colony.id],
  );
  const savedLevel = useSyncExternalStore(
    subscribe,
    () => store.get(colony.id)?.starBaseLevel ?? null,
  );
  const starBaseLevel = savedLevel ?? DEFAULT_STAR_BASE_LEVEL;
  const selectId = `star-base-level-${colony.id}`;

  return (
    <div role="tabpanel" aria-label={colony.name} className="flex items-center gap-3">
      <label htmlFor={selectId} className="text-sm text-white/60">
        Star Base level
      </label>
      <select
        id={selectId}
        value={starBaseLevel}
        onChange={(event) => store.set(colony.id, Number(event.target.value), now())}
        className="rounded-lg border border-white/15 bg-[#120c24] px-3 py-1.5 text-sm text-white"
      >
        {catalog.starBase.map(({ level }) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Planner({ store, catalog, now }: PlannerProps) {
  const [activeId, setActiveId] = useState(MAIN_COLONY_ID);
  const activeColony = COLONIES.find((colony) => colony.id === activeId) ?? COLONIES[0];

  return (
    <section className="w-full flex-1 rounded-2xl border border-white/10 p-6">
      <h2 className="mb-4 text-lg font-semibold text-white">Planner</h2>

      <div role="tablist" aria-label="Colonies" className="mb-4 flex flex-wrap gap-1">
        {COLONIES.map((colony) => {
          const unlocked = isUnlocked(colony);
          const selected = colony.id === activeColony.id;
          return (
            <button
              key={colony.id}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={!unlocked}
              onClick={() => setActiveId(colony.id)}
              className={`flex flex-col items-start rounded-lg px-3 py-1.5 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                selected ? "bg-white/12 text-[#e9e6f5]" : "text-white/40"
              } ${unlocked ? "" : "opacity-40"}`}
            >
              <span>{colony.name}</span>
              {!unlocked && (
                <span className="text-xs font-normal">
                  Requires Observatory level {colony.requiredObservatoryLevel}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <ColonyPanel
        key={activeColony.id}
        colony={activeColony}
        store={store}
        catalog={catalog}
        now={now}
      />
    </section>
  );
}
