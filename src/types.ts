export type CreatureId = "mossbun" | "emberpup" | "tidetot" | "volthorn" | "moonmew";

export interface CreaturePalette {
  body: number;
  belly: number;
  accent: number;
  eye: number;
  glow: number;
}

export interface CreatureDefinition {
  id: CreatureId;
  name: string;
  title: string;
  normalPalette: CreaturePalette;
  shinyPalette: CreaturePalette;
  assets: {
    normal: string;
    shiny: string;
  };
  catchRate: number;
}

export interface PlayerProgress {
  selectedCreatureId: CreatureId;
  unlockedCreatureIds: CreatureId[];
  shinyCaughtCreatureIds: CreatureId[];
  gems: number;
  throwsSinceLastShiny: number;
}

export interface HudState {
  creatureId: CreatureId;
  creatureName: string;
  creatureTitle: string;
  throwsSinceLastShiny: number;
  gems: number;
  isShiny: boolean;
  message: string;
  creatures: Array<{
    id: CreatureId;
    name: string;
    title: string;
    unlocked: boolean;
    selected: boolean;
    shinyCaught: boolean;
  }>;
}

export type GameEvent =
  | { type: "select-creature"; creatureId: CreatureId }
  | { type: "unlock-creature"; creatureId: CreatureId }
  | { type: "hud-ready" };
