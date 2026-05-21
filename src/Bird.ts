import { clamp, type Rect } from "./utils";

export interface BirdConfig {
  x: number;
  startY: number;
  gravity: number;
  flapStrength: number;
  radius: number;
}

export class Bird {
  x: number;
  y: number;
  velocityY = 0;
  rotation = 0;

  private readonly config: BirdConfig;
  private idleTime = 0;

  constructor(config: BirdConfig) {
    this.config = config;
    this.x = config.x;
    this.y = config.startY;
  }

  reset(): void {
    this.x = this.config.x;
    this.y = this.config.startY;
    this.velocityY = 0;
    this.rotation = 0;
    this.idleTime = 0;
  }

  flap(): void {
    this.velocityY = this.config.flapStrength;
  }

  update(dt: number): void {
    this.velocityY += this.config.gravity * dt;
    this.y += this.velocityY * dt;
    this.rotation = clamp(this.velocityY / 760, -0.55, 1.25);
  }

  updateIdle(dt: number): void {
    this.idleTime += dt;
    this.y = this.config.startY + Math.sin(this.idleTime * 3.8) * 7;
    this.rotation = Math.sin(this.idleTime * 3.8) * 0.08;
    this.velocityY = 0;
  }

  getCollisionBox(): Rect {
    const radius = this.config.radius;

    return {
      x: this.x - radius * 0.72,
      y: this.y - radius * 0.62,
      width: radius * 1.36,
      height: radius * 1.22,
    };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const radius = this.config.radius;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.fillStyle = "rgba(25, 42, 66, 0.18)";
    ctx.beginPath();
    ctx.ellipse(-3, radius * 0.55, radius * 0.98, radius * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffc93c";
    ctx.strokeStyle = "#cc8120";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.02, radius * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f39c12";
    ctx.strokeStyle = "#b85c00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-radius * 0.25, radius * 0.14, radius * 0.46, radius * 0.32, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ff8b2b";
    ctx.strokeStyle = "#b85c00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(radius * 0.83, -radius * 0.12);
    ctx.lineTo(radius * 1.36, radius * 0.04);
    ctx.lineTo(radius * 0.82, radius * 0.26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#28435d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(radius * 0.36, -radius * 0.33, radius * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#1d2f45";
    ctx.beginPath();
    ctx.arc(radius * 0.43, -radius * 0.32, radius * 0.085, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
