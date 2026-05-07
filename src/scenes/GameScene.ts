import Phaser from "phaser";
import { CREATURES, getCreature } from "../data/creatures.js";
import { rollCapture } from "../systems/capture.js";
import { rollShiny } from "../systems/shiny.js";
import { hasCaughtShiny, hasUnlocked, loadProgress, saveProgress } from "../state/progress.js";
import type { CreatureDefinition, CreatureId, GameEvent, HudState, PlayerProgress } from "../types.js";

const GAME_EVENTS = "game-events";
const HUD_EVENTS = "hud-events";

export class GameScene extends Phaser.Scene {
  private progress!: PlayerProgress;
  private creature!: Phaser.GameObjects.Image;
  private creatureShadow!: Phaser.GameObjects.Ellipse;
  private ball!: Phaser.GameObjects.Container;
  private ballHitGuide!: Phaser.GameObjects.Graphics;
  private aimLine!: Phaser.GameObjects.Graphics;
  private sparkleLayer!: Phaser.GameObjects.Graphics;
  private dragStart: Phaser.Math.Vector2 | null = null;
  private ballVelocity = new Phaser.Math.Vector2(0, 0);
  private ballHome = new Phaser.Math.Vector2(0, 0);
  private targetPoint = new Phaser.Math.Vector2(0, 0);
  private isBallFlying = false;
  private resolving = false;
  private currentShiny = false;
  private message = "拖住下方精灵球，往后拉再松手。";
  private spawnIndex = 0;

  private readonly missRecoveryMs = 180;
  private readonly escapeRecoveryMs = 240;
  private readonly normalCaughtRecoveryMs = 140;
  private readonly shinyCaughtRecoveryMs = 320;

  constructor() {
    super("GameScene");
  }

  preload(): void {
    for (const creature of CREATURES) {
      this.load.image(`${creature.id}-normal`, creature.assets.normal);
      this.load.image(`${creature.id}-shiny`, creature.assets.shiny);
    }
  }

  create(): void {
    this.progress = loadProgress();
    this.createTextures();
    this.createWorld();
    this.spawnCreature(false);
    this.createBall();
    this.registerInput();
    this.registerDomEvents();
    this.syncHud();
  }

  update(_: number, delta: number): void {
    if (!this.isBallFlying) {
      return;
    }

    const seconds = delta / 1000;
    this.ballVelocity.y += 760 * seconds;
    this.ball.x += this.ballVelocity.x * seconds;
    this.ball.y += this.ballVelocity.y * seconds;
    this.ball.rotation += 10 * seconds;

    if (Phaser.Math.Distance.Between(this.ball.x, this.ball.y, this.targetPoint.x, this.targetPoint.y) < 58) {
      this.resolveThrow(true);
      return;
    }

    if (this.ball.y > this.scale.height + 90 || this.ball.x < -90 || this.ball.x > this.scale.width + 90) {
      this.resolveThrow(false);
    }
  }

  private createWorld(): void {
    this.cameras.main.setBackgroundColor("#11121a");
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x11121a).setOrigin(0);

    const bg = this.add.graphics();
    bg.fillStyle(0x181622, 1);
    bg.fillRoundedRect(24, 44, this.scale.width - 48, this.scale.height - 88, 14);
    bg.lineStyle(4, 0xfff7b3, 1);
    bg.strokeRoundedRect(24, 44, this.scale.width - 48, this.scale.height - 88, 14);

    for (let i = 0; i < 48; i += 1) {
      const x = Phaser.Math.Between(34, this.scale.width - 34);
      const y = Phaser.Math.Between(56, this.scale.height - 70);
      const color = Phaser.Math.RND.pick([0x322538, 0x56402c, 0x243b42, 0x44333b]);
      bg.fillStyle(color, 0.42);
      bg.fillTriangle(x, y, x + Phaser.Math.Between(12, 28), y + Phaser.Math.Between(-10, 16), x - Phaser.Math.Between(8, 24), y + Phaser.Math.Between(8, 22));
    }

    this.add.rectangle(0, this.scale.height - 68, this.scale.width, 80, 0x0d0e15, 0.86).setOrigin(0);
    this.add.rectangle(0, this.scale.height - 70, this.scale.width, 3, 0xfff7b3, 0.8).setOrigin(0);

    this.creatureShadow = this.add.ellipse(this.scale.width * 0.68, this.scale.height * 0.69, 170, 34, 0x030307, 0.42);
    this.sparkleLayer = this.add.graphics();
    this.aimLine = this.add.graphics();
  }

  private createBall(): void {
    const bottomOffset = this.scale.height > this.scale.width ? 260 : 185;
    this.ballHome.set(this.scale.width * 0.5, this.scale.height - bottomOffset);
    this.ball = this.add.container(this.ballHome.x, this.ballHome.y);
    const outline = this.add.circle(0, 0, 29, 0x080911).setStrokeStyle(5, 0x080911);
    const top = this.add.arc(0, -1, 24, 180, 360, false, 0xd55154);
    const bottom = this.add.arc(0, 1, 24, 0, 180, false, 0xfff1c0);
    const band = this.add.rectangle(0, 0, 51, 9, 0x080911);
    const core = this.add.circle(0, 0, 10, 0xfff7b3).setStrokeStyle(4, 0x080911);
    this.ball.add([outline, top, bottom, band, core]);
    this.ball.setSize(58, 58);
    this.ball.setInteractive(new Phaser.Geom.Circle(0, 0, 48), Phaser.Geom.Circle.Contains);
    this.ballHitGuide = this.add.graphics();
    this.drawBallHitGuide();
  }

  private registerInput(): void {
    this.ball.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.isBallFlying || this.resolving) {
        return;
      }
      this.dragStart = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
      this.message = "往后拉得越远，投得越猛。";
      this.syncHud();
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.dragStart || this.isBallFlying || this.resolving) {
        return;
      }

      const pull = new Phaser.Math.Vector2(pointer.worldX - this.dragStart.x, pointer.worldY - this.dragStart.y);
      const clamped = pull.clone().limit(135);
      this.ball.setPosition(this.ballHome.x + clamped.x * 0.42, this.ballHome.y + clamped.y * 0.42);
      this.drawBallHitGuide();
      this.drawAim(clamped);
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (!this.dragStart || this.isBallFlying || this.resolving) {
        return;
      }

      const pull = new Phaser.Math.Vector2(pointer.worldX - this.dragStart.x, pointer.worldY - this.dragStart.y).limit(145);
      this.dragStart = null;
      this.aimLine.clear();

      if (pull.length() < 16) {
        this.resetBall();
        this.message = "拉远一点再松手。";
        this.syncHud();
        return;
      }

      this.ballVelocity.set(-pull.x * 6.8, -pull.y * 6.8 - 170);
      this.isBallFlying = true;
      this.message = "精灵球飞出去了!";
      this.syncHud();
    });
  }

  private registerDomEvents(): void {
    window.addEventListener(GAME_EVENTS, ((event: CustomEvent<GameEvent>) => {
      if (event.detail.type === "select-creature") {
        this.selectCreature(event.detail.creatureId);
      }

      if (event.detail.type === "unlock-creature") {
        this.unlockCreature(event.detail.creatureId);
      }
    }) as EventListener);
  }

  private selectCreature(creatureId: CreatureId): void {
    if (!hasUnlocked(this.progress, creatureId)) {
      this.message = "这个精灵还需要精灵宝石解锁。";
      this.syncHud();
      return;
    }

    if (this.progress.selectedCreatureId === creatureId) {
      return;
    }

    this.progress.selectedCreatureId = creatureId;
    saveProgress(this.progress);
    this.spawnCreature(false);
    this.message = `${getCreature(creatureId).name} 登场。`;
    this.syncHud();
  }

  private unlockCreature(creatureId: CreatureId): void {
    if (hasUnlocked(this.progress, creatureId)) {
      this.selectCreature(creatureId);
      return;
    }

    if (this.progress.gems <= 0) {
      this.message = "先捕捉异色精灵，获得精灵宝石。";
      this.syncHud();
      return;
    }

    this.progress.gems -= 1;
    this.progress.unlockedCreatureIds.push(creatureId);
    this.progress.selectedCreatureId = creatureId;
    saveProgress(this.progress);
    this.spawnCreature(false);
    this.message = `消耗 1 个宝石，${getCreature(creatureId).name} 已解锁。`;
    this.syncHud();
  }

  private resolveThrow(hit: boolean): void {
    if (this.resolving) {
      return;
    }

    this.resolving = true;
    this.isBallFlying = false;

    if (!hit) {
      this.progress.throwsSinceLastShiny += 1;
      this.message = "擦肩而过，再校准一下角度。";
      this.time.delayedCall(this.missRecoveryMs, () => this.afterThrow());
      return;
    }

    const creature = getCreature(this.progress.selectedCreatureId);
    this.creature.setVisible(false);
    this.creatureShadow.setVisible(false);
    this.tweens.add({
      targets: this.ball,
      x: this.targetPoint.x,
      y: this.targetPoint.y + 46,
      scale: 0.88,
      duration: 180,
      ease: "Back.easeOut",
      onComplete: () => this.playCaptureShake(creature)
    });
  }

  private playCaptureShake(creature: CreatureDefinition): void {
    const caught = rollCapture(creature, this.currentShiny);
    this.tweens.add({
      targets: this.ball,
      x: { from: this.ball.x - 12, to: this.ball.x + 12 },
      yoyo: true,
      repeat: caught ? 1 : 1,
      duration: 72,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (caught) {
          this.handleCaught(creature);
        } else {
          this.message = this.currentShiny ? "异色挣脱了，稳住，还有机会。" : `${creature.name} 挣脱了。`;
          this.playBallBreakFx();
          this.creature.setVisible(true);
          this.creatureShadow.setVisible(true);
          this.time.delayedCall(this.escapeRecoveryMs, () => this.afterThrow());
        }
      }
    });
  }

  private handleCaught(creature: CreatureDefinition): void {
    this.progress.throwsSinceLastShiny += 1;
    if (this.currentShiny && !hasCaughtShiny(this.progress, creature.id)) {
      this.progress.shinyCaughtCreatureIds.push(creature.id);
      this.progress.gems += 1;
      this.message = `收服异色${creature.name}! 获得 1 个精灵宝石。`;
      this.burstSparkles();
    } else if (this.currentShiny) {
      this.message = `又收服了一只异色${creature.name}!`;
      this.burstSparkles();
    } else {
      this.message = `${creature.name} 收服成功。`;
    }

    this.time.delayedCall(this.currentShiny ? this.shinyCaughtRecoveryMs : this.normalCaughtRecoveryMs, () => this.afterThrow());
  }

  private afterThrow(): void {
    const nextIsShiny = rollShiny(this.progress.throwsSinceLastShiny);
    if (nextIsShiny) {
      this.progress.throwsSinceLastShiny = 0;
    }

    saveProgress(this.progress);
    this.spawnCreature(nextIsShiny);
    this.resetBall();
    this.resolving = false;

    if (nextIsShiny) {
      const creature = getCreature(this.progress.selectedCreatureId);
      this.message = `异色${creature.name} 出现了!`;
      this.cameras.main.shake(260, 0.006);
      this.burstSparkles();
    }

    this.syncHud();
  }

  private spawnCreature(isShiny: boolean): void {
    this.currentShiny = isShiny;
    this.creature?.destroy();
    const creature = getCreature(this.progress.selectedCreatureId);
    this.pickNextCreaturePosition();
    this.creature = this.add.image(this.targetPoint.x, this.targetPoint.y, `${creature.id}-${isShiny ? "shiny" : "normal"}`);
    this.creature.setOrigin(0.5, 0.55);
    this.fitCreatureImage(this.creature, isShiny);
    this.creatureShadow.setVisible(true);
    this.creatureShadow.setPosition(this.targetPoint.x, this.targetPoint.y + 136);
  }

  private fitCreatureImage(image: Phaser.GameObjects.Image, isShiny: boolean): void {
    const maxHeight = isShiny ? 340 : 320;
    const maxWidth = 360;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    image.setScale(scale);
  }

  private pickNextCreaturePosition(): void {
    const positions = [
      { x: 0.5, y: 0.48 },
      { x: 0.43, y: 0.5 },
      { x: 0.58, y: 0.47 },
      { x: 0.53, y: 0.42 },
      { x: 0.47, y: 0.44 }
    ];
    const position = positions[this.spawnIndex % positions.length];
    this.spawnIndex += 1;
    this.targetPoint.set(this.scale.width * position.x, this.scale.height * position.y);
  }

  private createTextures(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(6, 6, 6);
    graphics.generateTexture("spark", 12, 12);
    graphics.destroy();
  }

  private drawAim(pull: Phaser.Math.Vector2): void {
    this.aimLine.clear();
    const power = Phaser.Math.Clamp(pull.length() / 145, 0, 1);
    this.aimLine.lineStyle(5, 0xfff7b3, 0.88);
    this.aimLine.beginPath();
    this.aimLine.moveTo(this.ball.x, this.ball.y);
    this.aimLine.lineTo(this.ball.x - pull.x * 1.45, this.ball.y - pull.y * 1.45 - 40 * power);
    this.aimLine.strokePath();
    this.aimLine.fillStyle(0xfff7b3, 0.28);
    this.aimLine.fillCircle(this.ball.x - pull.x * 1.45, this.ball.y - pull.y * 1.45 - 40 * power, 18 + 18 * power);
  }

  private drawBallHitGuide(): void {
    this.ballHitGuide.clear();
    this.drawDashedCircle(this.ballHitGuide, this.ball.x, this.ball.y, 48, 0xfff7b3, 0.68, 4);
    this.drawDashedCircle(this.ballHitGuide, this.ball.x, this.ball.y, 56, 0x52c7ff, 0.42, 2);
  }

  private drawDashedCircle(graphics: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, color: number, alpha: number, width: number): void {
    const segments = 34;
    graphics.lineStyle(width, color, alpha);
    for (let i = 0; i < segments; i += 2) {
      const start = (i / segments) * Math.PI * 2;
      const end = ((i + 1) / segments) * Math.PI * 2;
      graphics.beginPath();
      graphics.arc(x, y, radius, start, end, false);
      graphics.strokePath();
    }
  }

  private resetBall(): void {
    this.isBallFlying = false;
    this.ballVelocity.set(0, 0);
    this.ball.setPosition(this.ballHome.x, this.ballHome.y);
    this.ball.setRotation(0);
    this.ball.setScale(1);
    this.ball.setVisible(true);
    this.drawBallHitGuide();
  }

  private playBallBreakFx(): void {
    const x = this.ball.x;
    const y = this.ball.y;
    this.ball.setVisible(false);
    for (let i = 0; i < 14; i += 1) {
      const shard = this.add.rectangle(x, y, Phaser.Math.Between(5, 11), Phaser.Math.Between(4, 9), Phaser.Math.RND.pick([0xd55154, 0xfff1c0, 0x080911, 0xfff7b3]));
      shard.setRotation(Phaser.Math.FloatBetween(0, Math.PI));
      this.tweens.add({
        targets: shard,
        x: x + Phaser.Math.Between(-82, 82),
        y: y + Phaser.Math.Between(-64, 58),
        alpha: 0,
        rotation: shard.rotation + Phaser.Math.FloatBetween(-4, 4),
        duration: Phaser.Math.Between(220, 380),
        ease: "Cubic.easeOut",
        onComplete: () => shard.destroy()
      });
    }
  }

  private burstSparkles(): void {
    for (let i = 0; i < 26; i += 1) {
      const spark = this.add.image(this.targetPoint.x, this.targetPoint.y, "spark");
      spark.setTint(Phaser.Math.RND.pick([0xfff06c, 0xffffff, 0x8fffff, 0xff9edb]));
      spark.setScale(Phaser.Math.FloatBetween(0.7, 1.6));
      this.tweens.add({
        targets: spark,
        x: this.targetPoint.x + Phaser.Math.Between(-150, 150),
        y: this.targetPoint.y + Phaser.Math.Between(-130, 80),
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(520, 980),
        ease: "Cubic.easeOut",
        onComplete: () => spark.destroy()
      });
    }
  }

  private syncHud(): void {
    const selectedCreature = getCreature(this.progress.selectedCreatureId);
    const state: HudState = {
      creatureId: selectedCreature.id,
      creatureName: selectedCreature.name,
      creatureTitle: selectedCreature.title,
      throwsSinceLastShiny: this.progress.throwsSinceLastShiny,
      gems: this.progress.gems,
      isShiny: this.currentShiny,
      message: this.message,
      creatures: CREATURES.map((creature) => ({
        id: creature.id,
        name: creature.name,
        title: creature.title,
        unlocked: hasUnlocked(this.progress, creature.id),
        selected: creature.id === this.progress.selectedCreatureId,
        shinyCaught: hasCaughtShiny(this.progress, creature.id)
      }))
    };
    window.dispatchEvent(new CustomEvent<HudState>(HUD_EVENTS, { detail: state }));
  }
}

export { GAME_EVENTS, HUD_EVENTS };
