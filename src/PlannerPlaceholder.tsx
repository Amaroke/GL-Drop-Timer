import { Fragment, useState } from "react";

const COLONY_TABS = ["Planet", ...Array.from({ length: 11 }, (_, i) => `Colony ${i + 1}`)];

type BuildingCategory = {
  category: string;
  buildings: string[];
};

const CATEGORIES: BuildingCategory[] = [
  { category: "Resource", buildings: ["Mineral Extractor", "Gas Refinery"] },
  { category: "Military", buildings: ["Barracks", "Factory"] },
  { category: "Main", buildings: ["Warehouse", "Vault"] },
  { category: "Defensive", buildings: ["Cannon Blast", "Sniper Tower"] },
];

export function PlannerPlaceholder() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className="w-full flex-1 rounded-2xl border border-dashed border-white/15 p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-white">Planner</h2>
        <span className="text-sm text-white/40">Preview, no data is saved here yet</span>
      </div>

      <div role="tablist" aria-label="Colonies" className="mb-4 flex flex-wrap gap-1">
        {COLONY_TABS.map((label, index) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={index === activeTab}
            onClick={() => setActiveTab(index)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: index === activeTab ? "rgba(255,255,255,0.12)" : "transparent",
              color: index === activeTab ? "#e9e6f5" : "rgba(255,255,255,0.4)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={COLONY_TABS[activeTab]}>
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="text-white/40">
              <th className="border-b border-white/10 py-2 pr-4 font-medium">Building</th>
              <th className="border-b border-white/10 py-2 pr-4 font-medium">Owned / Max</th>
              <th className="border-b border-white/10 py-2 pr-4 font-medium">Level / Max</th>
              <th className="border-b border-white/10 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map(({ category, buildings }) => (
              <Fragment key={category}>
                <tr>
                  <td
                    colSpan={4}
                    className="pt-3 pb-1 text-xs font-semibold text-white/30 uppercase"
                  >
                    {category}
                  </td>
                </tr>
                {buildings.map((building) => (
                  <tr key={building} className="text-white/70">
                    <td className="border-b border-white/5 py-1.5 pr-4">{building}</td>
                    <td className="border-b border-white/5 py-1.5 pr-4 text-white/30">—</td>
                    <td className="border-b border-white/5 py-1.5 pr-4 text-white/30">—</td>
                    <td className="border-b border-white/5 py-1.5 text-white/30">—</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
