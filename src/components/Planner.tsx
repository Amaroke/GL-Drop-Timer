import { useCallback, useState, useSyncExternalStore } from "react";
import { BuildingsList } from "./BuildingsList";
import { groupedBuildingsForColony } from "../planner/buildings";
import type { Catalog } from "../planner/catalog";
import { COLONIES, MAIN_COLONY_ID, type ColonyDefinition } from "../planner/colonies";
import type { ColonyBuildings, ColonyStore } from "../store/colonyStore";

const DEFAULT_STAR_BASE_LEVEL = 1;
const OBSERVATORY_LEVEL_UNTRACKED = 0;
const NO_BUILDINGS: ColonyBuildings = {};

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
  const entry = useSyncExternalStore(subscribe, () => store.get(colony.id));
  const starBaseLevel = entry?.starBaseLevel ?? DEFAULT_STAR_BASE_LEVEL;
  const buildings = entry?.buildings ?? NO_BUILDINGS;
  const groups = groupedBuildingsForColony(catalog, colony.id);
  const selectId = `star-base-level-${colony.id}`;

  function save(changes: { starBaseLevel?: number; buildings?: ColonyBuildings }) {
    store.set(colony.id, { starBaseLevel, buildings, ...changes, updatedAt: now() });
  }

  return (
    <div role="tabpanel" aria-label={colony.name}>
      <div className="flex items-center gap-3">
        <label htmlFor={selectId} className="text-sm text-white/60">
          Star Base level
        </label>
        <select
          id={selectId}
          value={starBaseLevel}
          onChange={(event) => save({ starBaseLevel: Number(event.target.value) })}
          className="rounded-lg border border-white/15 bg-[#120c24] px-3 py-1.5 text-sm text-white"
        >
          {catalog.starBase.map(({ level }) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>

      <BuildingsList
        groups={groups}
        starBaseLevel={starBaseLevel}
        buildings={buildings}
        onChange={(typeId, levels) => save({ buildings: { ...buildings, [typeId]: levels } })}
      />
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
