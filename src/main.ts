import { recordVisit } from "./Analytics";
import { Game } from "./Game";
import { startUpdateWatcher } from "./Update";
import "./style.css";

const APP_CACHE_NAME = "sappy-bird-v9";
const APP_SHELL_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");

if (!canvas) {
  throw new Error("Game canvas was not found.");
}

const game = new Game(canvas);
game.start();
disablePageZoom();
recordVisit();
const stopUpdateWatcher = startUpdateWatcher(() => {
  game.setUpdateAvailable();
});

window.addEventListener("beforeunload", () => {
  stopUpdateWatcher();
  game.destroy();
});

if (import.meta.env.PROD) {
  registerServiceWorker();
}

function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
    void cacheCurrentAppShell();
  });
}

async function cacheCurrentAppShell(): Promise<void> {
  if (!("caches" in window)) {
    return;
  }

  const sameOriginResources = performance
    .getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter((url) => {
      try {
        return new URL(url).origin === window.location.origin;
      } catch {
        return false;
      }
    });

  const urls = new Set([...APP_SHELL_URLS, ...sameOriginResources]);
  const cache = await caches.open(APP_CACHE_NAME);

  await Promise.all(
    [...urls].map((url) =>
      cache.add(url).catch(() => {
        // Some browser-generated dev URLs are not worth failing the whole cache pass.
      }),
    ),
  );
}

function disablePageZoom(): void {
  let lastTouchEnd = 0;

  document.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    },
    { passive: false },
  );

  document.addEventListener(
    "touchend",
    (event) => {
      const now = Date.now();

      if (now - lastTouchEnd < 320) {
        event.preventDefault();
      }

      lastTouchEnd = now;
    },
    { passive: false },
  );

  document.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey) {
        event.preventDefault();
      }
    },
    { passive: false },
  );

  window.addEventListener(
    "keydown",
    (event) => {
      const isZoomKey = ["+", "-", "=", "0"].includes(event.key);

      if ((event.ctrlKey || event.metaKey) && isZoomKey) {
        event.preventDefault();
      }
    },
    { passive: false },
  );

  for (const eventName of ["gesturestart", "gesturechange", "gestureend"]) {
    document.addEventListener(
      eventName,
      (event) => {
        event.preventDefault();
      },
      { passive: false },
    );
  }
}
