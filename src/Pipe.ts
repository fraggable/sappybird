import { drawRoundedRect, randomRange, type Rect } from "./utils";

export interface PipeConfig {
  canvasWidth: number;
  floorY: number;
  gap: number;
  minPipeHeight: number;
  speed: number;
  width: number;
}

export class Pipe {
  x: number;
  readonly gapY: number;
  readonly gap: number;
  readonly width: number;
  scored = false;

  private readonly speed: number;

  constructor(x: number, gapY: number, config: PipeConfig) {
    this.x = x;
    this.gapY = gapY;
    this.gap = config.gap;
    this.width = config.width;
    this.speed = config.speed;
  }

  static create(config: PipeConfig): Pipe {
    const minGapCenter = config.minPipeHeight + config.gap / 2;
    const maxGapCenter = config.floorY - config.minPipeHeight - config.gap / 2;
    const gapY = randomRange(minGapCenter, maxGapCenter);

    return new Pipe(config.canvasWidth + config.width, gapY, config);
  }

  update(dt: number): void {
    this.x -= this.speed * dt;
  }

  isOffscreen(): boolean {
    return this.x + this.width < -10;
  }

  hasPassed(birdX: number): boolean {
    return !this.scored && this.x + this.width < birdX;
  }

  collidesWith(rect: Rect): boolean {
    const pipeLeft = this.x;
    const pipeRight = this.x + this.width;
    const rectRight = rect.x + rect.width;
    const rectBottom = rect.y + rect.height;

    const overlapsX = rectRight > pipeLeft && rect.x < pipeRight;
    const outsideGap = rect.y < this.topPipeHeight || rectBottom > this.bottomPipeY;

    return overlapsX && outsideGap;
  }

  draw(ctx: CanvasRenderingContext2D, floorY: number): void {
    this.drawPipe(ctx, 0, this.topPipeHeight, true);
    this.drawPipe(ctx, this.bottomPipeY, floorY - this.bottomPipeY, false);
  }

  private get topPipeHeight(): number {
    return this.gapY - this.gap / 2;
  }

  private get bottomPipeY(): number {
    return this.gapY + this.gap / 2;
  }

  private drawPipe(
    ctx: CanvasRenderingContext2D,
    y: number,
    height: number,
    isTop: boolean,
  ): void {
    const capHeight = 30;
    const capOverhang = 8;
    const bodyY = isTop ? y : y + capHeight - 2;
    const bodyHeight = Math.max(0, height - capHeight + 2);
    const capY = isTop ? y + height - capHeight : y;

    const gradient = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
    gradient.addColorStop(0, "#1c8f55");
    gradient.addColorStop(0.35, "#35c875");
    gradient.addColorStop(1, "#11623d");

    ctx.fillStyle = gradient;
    drawRoundedRect(ctx, this.x, bodyY, this.width, bodyHeight, 6);

    ctx.fillStyle = "#41d97e";
    ctx.fillRect(this.x + 11, bodyY + 8, 8, Math.max(0, bodyHeight - 16));

    ctx.fillStyle = "#0b4f34";
    ctx.fillRect(this.x + this.width - 11, bodyY + 8, 6, Math.max(0, bodyHeight - 16));

    ctx.fillStyle = gradient;
    drawRoundedRect(
      ctx,
      this.x - capOverhang,
      capY,
      this.width + capOverhang * 2,
      capHeight,
      8,
    );

    ctx.strokeStyle = "#0f4d35";
    ctx.lineWidth = 3;
    ctx.strokeRect(this.x - capOverhang + 2, capY + 2, this.width + capOverhang * 2 - 4, capHeight - 4);
  }
}
