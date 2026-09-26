import { NumberField } from "./NumberField";
import {
  limitsAt,
  MIN_LEVEL,
  withCount,
  withLevel,
  type CategoryGroup,
} from "../planner/buildings";
import { instanceStatus, typeStatuses, unlocksAt, type TypeStatus } from "../planner/statuses";
import type { ColonyBuildings } from "../store/colonyStore";

const STATUS_LABELS: Record<TypeStatus, string> = {
  missing: "To construct",
  "below-limit": "To upgrade",
  "over-limit": "Over limit",
  maxed: "Maxed",
};

const STATUS_STYLES: Record<TypeStatus, string> = {
  missing: "bg-red-500/15 text-red-300",
  "below-limit": "bg-blue-500/15 text-blue-300",
  "over-limit": "bg-red-500/15 text-red-300",
  maxed: "bg-green-500/15 text-green-300",
};

function StatusBadge({ status, label }: { status: TypeStatus; label?: string }) {
  return (
    <span
      aria-label={label}
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

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
              const statuses = typeStatuses(type, starBaseLevel, levels);
              const unlockLevel = unlocksAt(type, starBaseLevel);
              return (
                <div
                  key={type.id}
                  role="group"
                  aria-label={type.name}
                  className={`flex flex-col gap-2 rounded-xl border border-white/10 p-3 ${
                    unlockLevel === null ? "" : "opacity-50"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-[#e9e6f5]">{type.name}</span>
                      {statuses.length > 0 && (
                        <ul aria-label="Statuses" className="flex gap-1">
                          {statuses.map((status) => (
                            <li key={status}>
                              <StatusBadge status={status} />
                            </li>
                          ))}
                        </ul>
                      )}
                      {unlockLevel !== null && (
                        <span className="text-xs text-white/60">
                          Unlocks at Star Base {unlockLevel}
                        </span>
                      )}
                    </div>
                    <NumberField
                      label={`${type.name} owned`}
                      value={levels.length}
                      min={0}
                      max={limits.maxCount}
                      onCommit={(count) => onChange(type.id, withCount(levels, count))}
                    />
                  </div>
                  {levels.map((level, index) => {
                    const status = instanceStatus(limits, index, level);
                    return (
                      <div key={index} className="flex items-center justify-between gap-2 pl-4">
                        <span className="text-xs text-white/50">Level</span>
                        <span className="flex items-center gap-2">
                          {status && (
                            <StatusBadge
                              status={status}
                              label={`${type.name} ${index + 1} status`}
                            />
                          )}
                          <NumberField
                            label={`${type.name} ${index + 1} level`}
                            value={level}
                            min={MIN_LEVEL}
                            max={limits.maxLevel}
                            onCommit={(next) => onChange(type.id, withLevel(levels, index, next))}
                          />
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
