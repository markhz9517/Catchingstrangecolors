import Phaser from "phaser";
import { GameScene, GAME_EVENTS, HUD_EVENTS } from "./scenes/GameScene.js";
import { GameHud } from "./ui/hud.js";
import type { GameEvent, HudState } from "./types.js";

const gameRoot = document.querySelector<HTMLElement>("#game-root");
const hudRoot = document.querySelector<HTMLElement>("#hud-root");
const deviceSelect = document.querySelector<HTMLElement>("#device-select");
const changeDevice = document.querySelector<HTMLButtonElement>("#change-device");

if (!gameRoot || !hudRoot || !deviceSelect || !changeDevice) {
  throw new Error("Game root elements are missing.");
}

const gameRootEl = gameRoot;
const hudRootEl = hudRoot;
const deviceSelectEl = deviceSelect;
const changeDeviceEl = changeDevice;

const DEVICE_MODE_KEY = "yise-device-mode-v1";
const requestedMode = new URLSearchParams(window.location.search).get("mode");
const savedMode = localStorage.getItem(DEVICE_MODE_KEY);
const selectedMode = requestedMode === "mobile" || requestedMode === "desktop" ? requestedMode : savedMode;

gameRootEl.closest<HTMLElement>("#game-shell")!.hidden = true;
changeDeviceEl.hidden = true;

function startGame(mode: "mobile" | "desktop"): void {
  localStorage.setItem(DEVICE_MODE_KEY, mode);
  document.body.dataset.deviceMode = mode;
  deviceSelectEl.hidden = true;
  gameRootEl.closest<HTMLElement>("#game-shell")!.hidden = false;
  changeDeviceEl.hidden = false;

  const hud = new GameHud(hudRootEl, (event: GameEvent) => {
    window.dispatchEvent(new CustomEvent<GameEvent>(GAME_EVENTS, { detail: event }));
  });

  window.addEventListener(HUD_EVENTS, ((event: CustomEvent<HudState>) => {
    hud.update(event.detail);
  }) as EventListener);

  const gameSize = mode === "mobile" ? { width: 720, height: 1280 } : { width: 1280, height: 720 };

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: gameRootEl,
    width: gameSize.width,
    height: gameSize.height,
    backgroundColor: "#11121a",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    pixelArt: true,
    antialias: false,
    scene: [GameScene]
  };

  new Phaser.Game(config);

  window.addEventListener("beforeunload", () => hud.destroy());
}

document.querySelectorAll<HTMLButtonElement>("[data-device-mode]").forEach((button) => {
  button.addEventListener("click", () => startGame(button.dataset.deviceMode as "mobile" | "desktop"));
});

changeDeviceEl.addEventListener("click", () => {
  localStorage.removeItem(DEVICE_MODE_KEY);
  window.location.href = window.location.pathname;
});

if (selectedMode === "mobile" || selectedMode === "desktop") {
  startGame(selectedMode);
}
