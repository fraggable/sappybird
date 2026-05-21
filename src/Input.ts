export type InputActionSource = "keyboard" | "pointer";
export type InputActionHandler = (source: InputActionSource) => void;

export class Input {
  private readonly canvas: HTMLCanvasElement;
  private readonly onAction: InputActionHandler;

  constructor(canvas: HTMLCanvasElement, onAction: InputActionHandler) {
    this.canvas = canvas;
    this.onAction = onAction;

    window.addEventListener("keydown", this.handleKeyDown, { passive: false });
    this.canvas.addEventListener("pointerdown", this.handlePointerDown, { passive: false });
  }

  destroy(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== "Space") {
      return;
    }

    event.preventDefault();

    if (!event.repeat) {
      this.onAction("keyboard");
    }
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    this.canvas.setPointerCapture?.(event.pointerId);
    this.onAction("pointer");
  };
}
