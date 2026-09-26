import { NumberField } from "./NumberField";
import {
  limitsAt,
  MIN_LEVEL,
  withCount,
  withLevel,
  type CategoryGroup,
} from "../planner/buildings";
import type { ColonyBuildings } from "../store/colonyStore";

type BuildingsListProps = {
  groups: CategoryGroup[];
  starBaseLevel: number;
  buildings: ColonyBuildings;
  onChange: (typeId: string, levels: number[]) => void;
};

export function BuildingsList({ groups, starBaseLevel, buildings, onChange }: BuildingsListProps) {
  return (
    <div className="mt-6 flex flex-col gap-6">
      {groups.map(({ category, types }) => (
        <section key={category}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/50">
            {category}
          </h3>
          <div className="flex flex-col gap-3">
            {types.map((type) => {
              const levels = buildings[type.id] ?? [];
              const limits = limitsAt(type, starBaseLevel);
              return (
                <div
                  key={type.id}
                  role="group"
                  aria-label={type.name}
                  className="flex flex-col gap-2 rounded-xl border border-white/10 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#e9e6f5]">{type.name}</span>
                    <NumberField
                      label={`${type.name} owned`}
                      value={levels.length}
                      min={0}
                      max={limits.maxCount}
                      onCommit={(count) => onChange(type.id, withCount(levels, count))}
                    />
                  </div>
                  {levels.map((level, index) => (
                    <div key={index} className="flex items-center justify-between gap-2 pl-4">
                      <span className="text-xs text-white/50">Level</span>
                      <NumberField
                        label={`${type.name} ${index + 1} level`}
                        value={level}
                        min={MIN_LEVEL}
                        max={limits.maxLevel}
                        onCommit={(next) => onChange(type.id, withLevel(levels, index, next))}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
