import { useId, useState } from "react";
import type { Catalog, Cost } from "../planner/catalog";
import { nextSteps, type NextStep, type StepOrder } from "../planner/nextSteps";
import type { ColonyBuildings } from "../store/colonyStore";

const COLLAPSED_COUNT = 5;

const ORDER_LABELS: Record<StepOrder, string> = {
  category: "Category then time",
  fastest: "Fastest first",
};

function stepLabel(step: NextStep): string {
  return step.kind === "build"
    ? `Build ${step.typeName} ${step.instance}`
    : `Upgrade ${step.typeName} ${step.instance} to level ${step.targetLevel}`;
}

function costText(cost: Cost): string {
  const entries = Object.entries(cost);
  if (entries.length === 0) return "No cost listed";
  return entries
    .map(([currency, amount]) => `${amount.toLocaleString("en-US")} ${currency}`)
    .join(", ");
}

function StepRow({ step }: { step: NextStep }) {
  const tooltipId = useId();
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2">
      <span className="text-sm text-[#e9e6f5]">{stepLabel(step)}</span>
      <span className="group relative">
        <span
          tabIndex={0}
          aria-describedby={tooltipId}
          className="cursor-help text-xs text-white/60 underline decoration-dotted"
        >
          {step.time ?? "time unknown"}
        </span>
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none invisible absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded-lg border border-white/15 bg-[#120c24] px-2 py-1 text-xs text-white group-focus-within:visible group-hover:visible"
        >
          {costText(step.cost)}
        </span>
      </span>
    </li>
  );
}

type NextStepsProps = {
  catalog: Catalog;
  colonyId: string;
  starBaseLevel: number;
  buildings: ColonyBuildings;
};

export function NextSteps({ catalog, colonyId, starBaseLevel, buildings }: NextStepsProps) {
  const [order, setOrder] = useState<StepOrder>("category");
  const [expanded, setExpanded] = useState(false);
  const selectId = useId();
  const steps = nextSteps(catalog, colonyId, starBaseLevel, buildings, order);
  const shown = expanded ? steps : steps.slice(0, COLLAPSED_COUNT);

  return (
    <section aria-label="Next steps" className="mt-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50">Next steps</h3>
        <span className="flex items-center gap-2">
          <label htmlFor={selectId} className="text-sm text-white/60">
            Order
          </label>
          <select
            id={selectId}
            value={order}
            onChange={(event) => setOrder(event.target.value as StepOrder)}
            className="rounded-lg border border-white/15 bg-[#120c24] px-3 py-1.5 text-sm text-white"
          >
            {(Object.keys(ORDER_LABELS) as StepOrder[]).map((value) => (
              <option key={value} value={value}>
                {ORDER_LABELS[value]}
              </option>
            ))}
          </select>
        </span>
      </div>

      {steps.length === 0 ? (
        <p className="text-sm text-white/60">Nothing to build or upgrade</p>
      ) : (
        <ul aria-label="Next steps" className="flex flex-col gap-2">
          {shown.map((step) => (
            <StepRow key={`${step.typeId}-${step.kind}-${step.instance}`} step={step} />
          ))}
        </ul>
      )}

      {steps.length > COLLAPSED_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-sm text-white/60 underline"
        >
          {expanded ? "Show fewer steps" : `Show all ${steps.length} steps`}
        </button>
      )}
    </section>
  );
}
