export const APP_VERSION = "sappy-bird-v9";

const CHECK_INTERVAL_MS = 30_000;
const VERSION_URL = "/version.json";

interface VersionPayload {
  version?: string;
}

export function startUpdateWatcher(onUpdateAvailable: () => void): () => void {
  let updateFound = false;

  const checkForUpdate = async (): Promise<void> => {
    if (updateFound || !navigator.onLine) {
      return;
    }

    try {
      const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as VersionPayload;

      if (payload.version && payload.version !== APP_VERSION) {
        updateFound = true;
        onUpdateAvailable();
        void navigator.serviceWorker?.getRegistration().then((registration) => registration?.update());
      }
    } catch {
      // Offline or transient network failures should not interrupt gameplay.
    }
  };

  const intervalId = window.setInterval(() => {
    void checkForUpdate();
  }, CHECK_INTERVAL_MS);

  window.addEventListener("online", checkForUpdate);
  document.addEventListener("visibilitychange", checkForUpdate);
  void checkForUpdate();

  return () => {
    window.clearInterval(intervalId);
    window.removeEventListener("online", checkForUpdate);
    document.removeEventListener("visibilitychange", checkForUpdate);
  };
}
