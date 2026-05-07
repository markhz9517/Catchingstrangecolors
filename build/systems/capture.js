export function rollCapture(creature, isShiny, random = Math.random) {
    const shinyPenalty = isShiny ? 0.82 : 1;
    return random() < creature.catchRate * shinyPenalty;
}
