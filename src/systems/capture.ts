import type { CreatureDefinition } from "../types.js";

export function rollCapture(creature: CreatureDefinition, isShiny: boolean, random: () => number = Math.random): boolean {
  const shinyPenalty = isShiny ? 0.82 : 1;
  return random() < creature.catchRate * shinyPenalty;
}
