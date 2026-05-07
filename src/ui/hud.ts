import { CREATURES } from "../data/creatures.js";
import type { CreatureId, GameEvent, HudState } from "../types.js";

type DispatchGameEvent = (event: GameEvent) => void;

export class GameHud {
  private readonly root: HTMLElement;
  private readonly dispatch: DispatchGameEvent;
  private state: HudState | null = null;

  constructor(root: HTMLElement, dispatch: DispatchGameEvent) {
    this.root = root;
    this.dispatch = dispatch;
    this.root.addEventListener("click", this.handleClick);
  }

  update(state: HudState): void {
    const drawerWasOpen = this.root.querySelector<HTMLDetailsElement>(".creature-drawer")?.open ?? true;
    this.state = state;
    const selected = state.creatures.find((creature) => creature.selected);
    this.root.innerHTML = `
      <div class="hud hud-top">
        <div class="brand-panel">
          <span class="pixel-label">当前目标</span>
          <strong>${state.creatureName}</strong>
          <small>${state.creatureTitle}</small>
        </div>
        <div class="meter-panel ${state.isShiny ? "is-shiny" : ""}">
          <span>${state.isShiny ? "异色出现" : "异色保底"}</span>
          <strong>${state.isShiny ? "抓住它!" : `${state.throwsSinceLastShiny}/80`}</strong>
        </div>
        <div class="gem-panel">
          <span>精灵宝石</span>
          <strong>${state.gems}</strong>
        </div>
      </div>
      <div class="toast ${state.isShiny ? "shiny-toast" : ""}">${state.message}</div>
      <details class="creature-drawer" ${drawerWasOpen ? "open" : ""}>
        <summary>
          <span>精灵列表</span>
          <strong>${state.creatures.filter((creature) => creature.unlocked).length}/5</strong>
        </summary>
        <div class="creature-dock" aria-label="精灵选择">
          ${state.creatures
            .map(
              (creature) => `
              <button class="creature-card ${creature.selected ? "selected" : ""} ${creature.unlocked ? "" : "locked"}"
                data-action="${creature.unlocked ? "select" : "unlock"}"
                data-id="${creature.id}"
                aria-pressed="${creature.selected}">
                <span class="mini-sprite mini-${creature.id}"></span>
                <span class="creature-copy">
                  <span class="creature-name">${creature.name}</span>
                  <span class="creature-state">${this.getCreatureState(creature.id, creature.unlocked, creature.shinyCaught)}</span>
                </span>
              </button>
            `
            )
            .join("")}
        </div>
      </details>
      <div class="aim-note">${selected ? `${selected.name} 等着你投出漂亮一球` : "拖动精灵球，松手投掷"}</div>
    `;
  }

  destroy(): void {
    this.root.removeEventListener("click", this.handleClick);
  }

  private readonly handleClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("[data-action][data-id]");
    if (!button) {
      return;
    }

    const creatureId = button.dataset.id as CreatureId;
    if (!CREATURES.some((creature) => creature.id === creatureId)) {
      return;
    }

    if (button.dataset.action === "select") {
      this.dispatch({ type: "select-creature", creatureId });
      return;
    }

    this.dispatch({ type: "unlock-creature", creatureId });
  };

  private getCreatureState(id: CreatureId, unlocked: boolean, shinyCaught: boolean): string {
    if (shinyCaught) {
      return "异色已收服";
    }

    if (unlocked) {
      return "已解锁";
    }

    const canUnlock = (this.state?.gems ?? 0) > 0;
    return canUnlock ? "宝石解锁" : "未解锁";
  }
}
