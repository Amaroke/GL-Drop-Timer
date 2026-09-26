import { useCallback, useState, useSyncExternalStore } from "react";
import { BuildingsList } from "./BuildingsList";
import { groupedBuildingsForColony } from "../planner/buildings";
import { filterToUpgrade } from "../planner/statuses";
import type { Catalog } from "../planner/catalog";
import {
  COLONIES,
  isColonyUnlocked,
  MAIN_COLONY_ID,
  observatoryLevel,
  type ColonyDefinition,
} from "../planner/colonies";
import type { ColonyBuildings, ColonyEntry, ColonyStore } from "../store/colonyStore";

const DEFAULT_STAR_BASE_LEVEL = 1;
const NO_BUILDINGS: ColonyBuildings = {};

type PlannerProps = {
  store: ColonyStore;
  catalog: Catalog;
  now: () => number;
};

function useColonyEntry(store: ColonyStore, colonyId: string): ColonyEntry | null {
  const subscribe = useCallback(
    (onChange: () => void) => store.subscribe(colonyId, onChange),
    [store, colonyId],
  );
  return useSyncExternalStore(subscribe, () => store.get(colonyId));
}

function ColonyPanel({ colony, store, catalog, now }: PlannerProps & { colony: ColonyDefinition }) {
  const entry = useColonyEntry(store, colony.id);
  const starBaseLevel = entry?.starBaseLevel ?? DEFAULT_STAR_BASE_LEVEL;
  const buildings = entry?.buildings ?? NO_BUILDINGS;
  const [onlyToUpgrade, setOnlyToUpgrade] = useState(false);
  const allGroups = groupedBuildingsForColony(catalog, colony.id);
  const groups = onlyToUpgrade ? filterToUpgrade(allGroups, starBaseLevel, buildings) : allGroups;
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
        <label className="ml-auto flex items-center gap-2 text-sm text-white/60">
          <input
            type="checkbox"
            checked={onlyToUpgrade}
            onChange={(event) => setOnlyToUpgrade(event.target.checked)}
          />
          Only what to upgrade
        </label>
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
  const observatory = observatoryLevel(
    useColonyEntry(store, MAIN_COLONY_ID)?.buildings ?? NO_BUILDINGS,
  );
  const activeColony =
    COLONIES.find((colony) => colony.id === activeId && isColonyUnlocked(colony, observatory)) ??
    COLONIES[0];

  return (
    <section className="w-full flex-1 rounded-2xl border border-white/10 p-6">
      <h2 className="mb-4 text-lg font-semibold text-white">Planner</h2>

      <div role="tablist" aria-label="Colonies" className="mb-4 flex flex-wrap gap-1">
        {COLONIES.map((colony) => {
          const unlocked = isColonyUnlocked(colony, observatory);
          const selected = colony.id === activeColony.id;
          return (
            <button
              key={colony.id}
              type="button"
              role="tab"
              aria-label={colony.name}
              aria-selected={selected}
              disabled={!unlocked}
              onClick={() => setActiveId(colony.id)}
              className={`rounded-md px-2 py-1 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                selected ? "bg-white/12 text-[#e9e6f5]" : "text-white/40"
              } ${unlocked ? "" : "opacity-40"}`}
            >
              {colony.shortName}
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
