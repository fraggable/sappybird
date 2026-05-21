import { Bird } from "./Bird";
import { Input } from "./Input";
import { Pipe } from "./Pipe";
import { Sound } from "./Sound";
import { clamp, drawRoundedRect, strokeRoundedRect } from "./utils";

type GameState = "ready" | "playing" | "gameOver" | "restart";

export const GAME_CONFIG = {
  canvasWidth: 432,
  canvasHeight: 768,
  groundHeight: 92,
  gravity: 1650,
  flapStrength: -520,
  pipeSpeed: 190,
  pipeGap: 172,
  pipeWidth: 78,
  pipeSpawnInterval: 1.32,
  minPipeHeight: 78,
  minCanvasWidth: 320,
  birdRadius: 22,
  birdX: 112,
  maxDelta: 1 / 30,
} as const;

const BEST_SCORE_KEY = "sappy-bird-best-score";

export class Game {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly bird: Bird;
  private readonly input: Input;
  private readonly sound = new Sound();

  private pipes: Pipe[] = [];
  private state: GameState = "ready";
  private score = 0;
  private bestScore = 0;
  private lastTime = 0;
  private elapsedTime = 0;
  private pipeTimer = 0;
  private groundOffset = 0;
  private animationFrameId = 0;
  private viewWidth: number = GAME_CONFIG.canvasWidth;
  private viewHeight: number = GAME_CONFIG.canvasHeight;
  private updateAvailable = false;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas 2D context is not available.");
    }

    this.canvas = canvas;
    this.ctx = context;
    this.bestScore = this.loadBestScore();
    this.bird = new Bird({
      x: GAME_CONFIG.birdX,
      startY: GAME_CONFIG.canvasHeight * 0.42,
      gravity: GAME_CONFIG.gravity,
      flapStrength: GAME_CONFIG.flapStrength,
      radius: GAME_CONFIG.birdRadius,
    });
    this.input = new Input(this.canvas, () => this.handleAction());

    this.resizeCanvas();
    window.addEventListener("resize", this.resizeCanvas);
    window.visualViewport?.addEventListener("resize", this.resizeCanvas);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  start(): void {
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  setUpdateAvailable(): void {
    this.updateAvailable = true;
  }

  destroy(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.input.destroy();
    window.removeEventListener("resize", this.resizeCanvas);
    window.visualViewport?.removeEventListener("resize", this.resizeCanvas);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
  }

  private readonly loop = (timestamp: number): void => {
    if (this.lastTime === 0) {
      this.lastTime = timestamp;
    }

    const rawDt = (timestamp - this.lastTime) / 1000;
    const dt = Math.min(rawDt, GAME_CONFIG.maxDelta);
    this.lastTime = timestamp;
    this.elapsedTime += dt;

    this.update(dt);
    this.draw();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    if (this.state === "ready") {
      this.bird.updateIdle(dt);
      this.scrollGround(dt, 0.45);
      return;
    }

    if (this.state === "playing") {
      this.bird.update(dt);
      this.updatePipes(dt);
      this.scrollGround(dt, 1);
      this.checkScore();
      this.checkCollisions();
      return;
    }

    if (this.state === "gameOver") {
      this.updateGameOverBird(dt);
    }
  }

  private handleAction(): void {
    if (this.updateAvailable && this.state !== "playing") {
      return;
    }

    this.sound.unlock();

    if (this.state === "ready") {
      this.beginRun();
      return;
    }

    if (this.state === "playing") {
      this.bird.flap();
      this.sound.flap();
      return;
    }

    if (this.state === "gameOver") {
      this.restart();
    }
  }

  private beginRun(): void {
    this.resetRound();
    this.state = "playing";
    this.bird.flap();
    this.sound.flap();
  }

  private restart(): void {
    this.state = "restart";
    this.beginRun();
  }

  private resetRound(): void {
    this.score = 0;
    this.pipes = [];
    this.pipeTimer = GAME_CONFIG.pipeSpawnInterval * 0.55;
    this.bird.reset();
  }

  private updatePipes(dt: number): void {
    this.pipeTimer += dt;

    if (this.pipeTimer >= GAME_CONFIG.pipeSpawnInterval) {
      this.pipeTimer -= GAME_CONFIG.pipeSpawnInterval;
      this.pipes.push(
        Pipe.create({
          canvasWidth: this.viewWidth,
          floorY: this.floorY,
          gap: GAME_CONFIG.pipeGap,
          minPipeHeight: GAME_CONFIG.minPipeHeight,
          speed: GAME_CONFIG.pipeSpeed,
          width: GAME_CONFIG.pipeWidth,
        }),
      );
    }

    for (const pipe of this.pipes) {
      pipe.update(dt);
    }

    this.pipes = this.pipes.filter((pipe) => !pipe.isOffscreen());
  }

  private checkScore(): void {
    for (const pipe of this.pipes) {
      if (!pipe.hasPassed(this.bird.x)) {
        continue;
      }

      pipe.scored = true;
      this.score += 1;
      this.sound.score();
    }
  }

  private checkCollisions(): void {
    const box = this.bird.getCollisionBox();
    const hitWorld = box.y <= 0 || box.y + box.height >= this.floorY;
    const hitPipe = this.pipes.some((pipe) => pipe.collidesWith(box));

    if (hitWorld || hitPipe) {
      this.endRun();
    }
  }

  private endRun(): void {
    if (this.state !== "playing") {
      return;
    }

    this.state = "gameOver";
    this.sound.hit();

    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem(BEST_SCORE_KEY, String(this.bestScore));
    }
  }

  private updateGameOverBird(dt: number): void {
    const box = this.bird.getCollisionBox();

    if (box.y + box.height < this.floorY) {
      this.bird.update(dt);
      return;
    }

    this.bird.y = this.floorY - box.height / 2;
    this.bird.velocityY = 0;
    this.bird.rotation = clamp(this.bird.rotation, 0.65, 1.2);
  }

  private scrollGround(dt: number, speedMultiplier: number): void {
    const tileWidth = 46;
    this.groundOffset =
      (this.groundOffset + GAME_CONFIG.pipeSpeed * speedMultiplier * dt) % tileWidth;
  }

  private draw(): void {
    this.ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);
    this.drawBackground();

    for (const pipe of this.pipes) {
      pipe.draw(this.ctx, this.floorY);
    }

    this.bird.draw(this.ctx);
    this.drawGround();
    this.drawScore();

    if (this.updateAvailable && this.state !== "playing") {
      this.drawUpdateOverlay();
    } else if (this.state === "ready") {
      this.drawStartOverlay();
    } else if (this.state === "gameOver") {
      this.drawGameOverOverlay();
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.viewHeight);
    gradient.addColorStop(0, "#79d7ff");
    gradient.addColorStop(0.58, "#b8eeff");
    gradient.addColorStop(1, "#f4f7d8");

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

    this.drawCloud(70, 118, 1);
    this.drawCloud(304, 180, 0.82);
    this.drawCloud(170, 268, 0.62);

    this.ctx.fillStyle = "#8fcf82";
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.floorY - 40);
    this.ctx.quadraticCurveTo(95, this.floorY - 76, 190, this.floorY - 42);
    this.ctx.quadraticCurveTo(this.viewWidth * 0.7, this.floorY - 88, this.viewWidth, this.floorY - 38);
    this.ctx.lineTo(this.viewWidth, this.floorY);
    this.ctx.lineTo(0, this.floorY);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawCloud(x: number, y: number, scale: number): void {
    const sway = Math.sin(this.elapsedTime * 0.55 + x) * 5;

    this.ctx.save();
    this.ctx.translate(x + sway, y);
    this.ctx.scale(scale, scale);
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.74)";
    this.ctx.beginPath();
    this.ctx.arc(-28, 10, 22, 0, Math.PI * 2);
    this.ctx.arc(0, 0, 30, 0, Math.PI * 2);
    this.ctx.arc(31, 11, 21, 0, Math.PI * 2);
    this.ctx.rect(-45, 9, 92, 25);
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawGround(): void {
    const groundY = this.floorY;
    const tileWidth = 46;

    this.ctx.fillStyle = "#dcb860";
    this.ctx.fillRect(0, groundY, this.viewWidth, GAME_CONFIG.groundHeight);

    this.ctx.fillStyle = "#77c65e";
    this.ctx.fillRect(0, groundY, this.viewWidth, 18);

    this.ctx.fillStyle = "#5aa846";
    for (let x = -tileWidth - this.groundOffset; x < this.viewWidth + tileWidth; x += tileWidth) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, groundY + 18);
      this.ctx.lineTo(x + 18, groundY + 18);
      this.ctx.lineTo(x + 28, groundY);
      this.ctx.lineTo(x + 10, groundY);
      this.ctx.closePath();
      this.ctx.fill();
    }

    this.ctx.fillStyle = "rgba(128, 87, 34, 0.28)";
    for (let x = -this.groundOffset; x < this.viewWidth + tileWidth; x += tileWidth) {
      this.ctx.fillRect(x, groundY + 44, 24, 5);
      this.ctx.fillRect(x + 17, groundY + 68, 30, 4);
    }
  }

  private drawScore(): void {
    const bestScoreY = 62;
    const currentScoreY = 116;

    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.font = "700 54px Arial, sans-serif";
    this.ctx.lineWidth = 7;
    this.ctx.strokeStyle = "rgba(32, 52, 72, 0.64)";
    this.ctx.fillStyle = "#ffffff";
    this.ctx.strokeText(String(this.score), this.viewWidth / 2, currentScoreY);
    this.ctx.fillText(String(this.score), this.viewWidth / 2, currentScoreY);

    this.ctx.font = "700 16px Arial, sans-serif";
    this.ctx.textAlign = "left";
    this.ctx.strokeStyle = "rgba(32, 52, 72, 0.55)";
    this.ctx.lineWidth = 4;
    this.ctx.strokeText(`BEST ${this.bestScore}`, 18, bestScoreY);
    this.ctx.fillText(`BEST ${this.bestScore}`, 18, bestScoreY);
  }

  private drawStartOverlay(): void {
    const centerX = this.viewWidth / 2;
    const panelWidth = Math.min(340, this.viewWidth - 24);
    const panelX = centerX - panelWidth / 2;

    this.drawOverlayPanel(panelX, 174, panelWidth, 404, false);
    this.drawSapDrop(centerX, 223, 0.64);

    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = "#16344f";
    this.ctx.font = "900 42px Arial, sans-serif";
    this.ctx.fillText("Sappy Bird", centerX, 278);

    this.ctx.font = "700 16px Arial, sans-serif";
    this.ctx.fillStyle = "#426a7d";
    this.ctx.fillText("tap or press space", centerX, 312);

    this.drawControlChip(centerX - 88, 344, 176, "START");

    this.ctx.fillStyle = "rgba(22, 52, 79, 0.12)";
    this.ctx.fillRect(centerX - 124, 409, 248, 2);

    this.ctx.font = "800 13px Arial, sans-serif";
    this.ctx.fillStyle = "#6b8898";
    this.ctx.fillText("BEST", centerX, 440);

    this.ctx.font = "900 30px Arial, sans-serif";
    this.ctx.fillStyle = "#16344f";
    this.ctx.fillText(String(this.bestScore), centerX, 476);

    this.drawHomeScreenTutorial();
  }

  private drawGameOverOverlay(): void {
    const centerX = this.viewWidth / 2;
    const panelWidth = Math.min(288, this.viewWidth - 24);
    const panelX = centerX - panelWidth / 2;

    this.drawOverlayPanel(panelX, 292, panelWidth, 210);

    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = "#16344f";
    this.ctx.font = "800 36px Arial, sans-serif";
    this.ctx.fillText("Game Over", centerX, 335);

    this.ctx.font = "700 20px Arial, sans-serif";
    this.ctx.fillStyle = "#2f5e76";
    this.ctx.fillText(`Score ${this.score}`, centerX, 388);
    this.ctx.fillText(`Best ${this.bestScore}`, centerX, 420);

    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "800 17px Arial, sans-serif";
    this.ctx.fillText("RESTART", centerX, 466);
  }

  private drawUpdateOverlay(): void {
    const centerX = this.viewWidth / 2;
    const panelWidth = Math.min(330, this.viewWidth - 24);
    const panelX = centerX - panelWidth / 2;

    this.drawOverlayPanel(panelX, 246, panelWidth, 232, false);
    this.drawSapDrop(centerX, 292, 0.54);

    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = "#16344f";
    this.ctx.font = "900 27px Arial, sans-serif";
    this.ctx.fillText("New version", centerX, 344);
    this.ctx.fillText("available", centerX, 378);

    this.ctx.font = "700 15px Arial, sans-serif";
    this.ctx.fillStyle = "#426a7d";
    this.ctx.fillText("Close and reopen", centerX, 424);
    this.ctx.fillText("Sappy Bird to update", centerX, 448);
  }

  private drawOverlayPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    showButton = true,
  ): void {
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    drawRoundedRect(this.ctx, x, y, width, height, 16);
    this.ctx.strokeStyle = "rgba(22, 52, 79, 0.22)";
    this.ctx.lineWidth = 3;
    strokeRoundedRect(this.ctx, x + 1.5, y + 1.5, width - 3, height - 3, 14);

    if (showButton) {
      this.ctx.fillStyle = "#ffb83d";
      drawRoundedRect(this.ctx, x + 92, y + height - 54, width - 184, 38, 19);
    }
  }

  private drawControlChip(x: number, y: number, width: number, label: string): void {
    const pulse = (Math.sin(this.elapsedTime * 4.2) + 1) / 2;
    this.ctx.fillStyle = `rgba(255, 184, 61, ${0.88 + pulse * 0.1})`;
    drawRoundedRect(this.ctx, x, y, width, 44, 22);

    this.ctx.fillStyle = "#16344f";
    this.ctx.font = "900 15px Arial, sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(label, x + width / 2, y + 22);
  }

  private drawHomeScreenTutorial(): void {
    const text = "Safari: Share, Add to Home Screen, to play offline";
    const maxWidth = this.viewWidth - 28;
    let fontSize = 12;

    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    do {
      this.ctx.font = `700 ${fontSize}px Arial, sans-serif`;
      fontSize -= 0.5;
    } while (this.ctx.measureText(text).width > maxWidth && fontSize >= 9);

    this.ctx.fillStyle = "#426a7d";
    this.ctx.fillText(text, this.viewWidth / 2, 534);
  }

  private drawSapDrop(x: number, y: number, scale: number): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(scale, scale);
    this.ctx.fillStyle = "#ffb83d";
    this.ctx.strokeStyle = "#c87512";
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -18);
    this.ctx.bezierCurveTo(18, 2, 20, 22, 0, 27);
    this.ctx.bezierCurveTo(-20, 22, -18, 2, 0, -18);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    this.ctx.beginPath();
    this.ctx.ellipse(-5, 4, 4, 8, 0.35, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private loadBestScore(): number {
    const stored = Number(localStorage.getItem(BEST_SCORE_KEY));
    return Number.isFinite(stored) ? stored : 0;
  }

  private get floorY(): number {
    return this.viewHeight - GAME_CONFIG.groundHeight;
  }

  private readonly resizeCanvas = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const rect = this.canvas.getBoundingClientRect();
    const canvasCssWidth = Math.max(1, rect.width || window.innerWidth);
    const canvasCssHeight = Math.max(1, rect.height || window.innerHeight);

    this.viewHeight = GAME_CONFIG.canvasHeight;
    this.viewWidth = Math.max(
      GAME_CONFIG.minCanvasWidth,
      Math.round(this.viewHeight * (canvasCssWidth / canvasCssHeight)),
    );

    this.canvas.width = Math.floor(this.viewWidth * dpr);
    this.canvas.height = Math.floor(this.viewHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.lastTime = 0;
    }
  };
}
