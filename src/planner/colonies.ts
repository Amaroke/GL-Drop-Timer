export type ColonyDefinition = {
  id: string;
  name: string;
  requiredObservatoryLevel: number;
};

export const MAIN_COLONY_ID = "main";

export const COLONIES: ColonyDefinition[] = [
  { id: MAIN_COLONY_ID, name: "Main planet", requiredObservatoryLevel: 0 },
  ...Array.from({ length: 11 }, (_, index) => ({
    id: `colony-${index + 1}`,
    name: `Colony ${index + 1}`,
    requiredObservatoryLevel: index + 1,
  })),
];
