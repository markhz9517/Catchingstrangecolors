export const SHINY_SOFT_PITY = 20;
export const SHINY_HARD_PITY = 80;
export function shinyChanceForThrow(throwsSinceLastShiny) {
    if (throwsSinceLastShiny < SHINY_SOFT_PITY) {
        return 0;
    }
    if (throwsSinceLastShiny >= SHINY_HARD_PITY) {
        return 1;
    }
    const pitySpan = SHINY_HARD_PITY - SHINY_SOFT_PITY;
    const progress = (throwsSinceLastShiny - SHINY_SOFT_PITY) / pitySpan;
    return 0.035 + progress * 0.22;
}
export function rollShiny(throwsSinceLastShiny, random = Math.random) {
    return random() < shinyChanceForThrow(throwsSinceLastShiny);
}
