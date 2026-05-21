const VISITOR_ID_KEY = "sappy-bird-visitor-id";
const VISIT_RECORDED_KEY = "sappy-bird-visit-recorded";
const PENDING_VISIT_KEY = "sappy-bird-pending-visit";
const VISIT_ENDPOINT = "/api/visit";

export function recordVisit(): void {
  if (sessionStorage.getItem(VISIT_RECORDED_KEY) !== "true") {
    sessionStorage.setItem(VISIT_RECORDED_KEY, "true");
    localStorage.setItem(PENDING_VISIT_KEY, "true");
  }

  void flushPendingVisit();
  window.addEventListener("online", handleOnline);
}

function handleOnline(): void {
  void flushPendingVisit();
}

async function flushPendingVisit(): Promise<void> {
  if (localStorage.getItem(PENDING_VISIT_KEY) !== "true") {
    return;
  }

  const response = await fetch(VISIT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      visitorId: getOrCreateVisitorId(),
    }),
    keepalive: true,
  }).catch(() => null);

  if (response?.ok) {
    localStorage.removeItem(PENDING_VISIT_KEY);
  }
}

function getOrCreateVisitorId(): string {
  const existing = localStorage.getItem(VISITOR_ID_KEY);

  if (existing) {
    return existing;
  }

  const visitorId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  localStorage.setItem(VISITOR_ID_KEY, visitorId);
  return visitorId;
}
