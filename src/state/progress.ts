import type { CreatureId, PlayerProgress } from "../types.js";

const STORAGE_KEY = "yise-capture-progress-v1";

export function createInitialProgress(): PlayerProgress {
  return {
    selectedCreatureId: "mossbun",
    unlockedCreatureIds: ["mossbun"],
    shinyCaughtCreatureIds: [],
    gems: 0,
    throwsSinceLastShiny: 0
  };
}

export function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialProgress();
    }

    const parsed = JSON.parse(raw) as PlayerProgress;
    return {
      ...createInitialProgress(),
      ...parsed,
      unlockedCreatureIds: Array.from(new Set(parsed.unlockedCreatureIds ?? ["mossbun"])) as CreatureId[],
      shinyCaughtCreatureIds: Array.from(new Set(parsed.shinyCaughtCreatureIds ?? [])) as CreatureId[]
    };
  } catch {
    return createInitialProgress();
  }
}

export function saveProgress(progress: PlayerProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function hasUnlocked(progress: PlayerProgress, creatureId: CreatureId): boolean {
  return progress.unlockedCreatureIds.includes(creatureId);
}

export function hasCaughtShiny(progress: PlayerProgress, creatureId: CreatureId): boolean {
  return progress.shinyCaughtCreatureIds.includes(creatureId);
}
