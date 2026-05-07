import Phaser from "phaser";
import { GameScene, GAME_EVENTS, HUD_EVENTS } from "./scenes/GameScene.js";
import { GameHud } from "./ui/hud.js";
const gameRoot = document.querySelector("#game-root");
const hudRoot = document.querySelector("#hud-root");
const deviceSelect = document.querySelector("#device-select");
const changeDevice = document.querySelector("#change-device");
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
gameRootEl.closest("#game-shell").hidden = true;
changeDeviceEl.hidden = true;
function startGame(mode) {
    localStorage.setItem(DEVICE_MODE_KEY, mode);
    document.body.dataset.deviceMode = mode;
    deviceSelectEl.hidden = true;
    gameRootEl.closest("#game-shell").hidden = false;
    changeDeviceEl.hidden = false;
    const hud = new GameHud(hudRootEl, (event) => {
        window.dispatchEvent(new CustomEvent(GAME_EVENTS, { detail: event }));
    });
    window.addEventListener(HUD_EVENTS, ((event) => {
        hud.update(event.detail);
    }));
    const gameSize = mode === "mobile" ? { width: 720, height: 1280 } : { width: 1280, height: 720 };
    const config = {
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
document.querySelectorAll("[data-device-mode]").forEach((button) => {
    button.addEventListener("click", () => startGame(button.dataset.deviceMode));
});
changeDeviceEl.addEventListener("click", () => {
    localStorage.removeItem(DEVICE_MODE_KEY);
    window.location.href = window.location.pathname;
});
if (selectedMode === "mobile" || selectedMode === "desktop") {
    startGame(selectedMode);
}
