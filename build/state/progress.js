const STORAGE_KEY = "yise-capture-progress-v1";
export function createInitialProgress() {
    return {
        selectedCreatureId: "mossbun",
        unlockedCreatureIds: ["mossbun"],
        shinyCaughtCreatureIds: [],
        gems: 0,
        throwsSinceLastShiny: 0
    };
}
export function loadProgress() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return createInitialProgress();
        }
        const parsed = JSON.parse(raw);
        return {
            ...createInitialProgress(),
            ...parsed,
            unlockedCreatureIds: Array.from(new Set(parsed.unlockedCreatureIds ?? ["mossbun"])),
            shinyCaughtCreatureIds: Array.from(new Set(parsed.shinyCaughtCreatureIds ?? []))
        };
    }
    catch {
        return createInitialProgress();
    }
}
export function saveProgress(progress) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}
export function hasUnlocked(progress, creatureId) {
    return progress.unlockedCreatureIds.includes(creatureId);
}
export function hasCaughtShiny(progress, creatureId) {
    return progress.shinyCaughtCreatureIds.includes(creatureId);
}
