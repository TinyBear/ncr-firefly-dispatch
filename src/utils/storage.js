import { isValidPoint, MAX_STOPS } from "./geofence";

const KEY = "ncr-firefly-stops-v1";

export function saveStops(depot, stops) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ depot, stops }));
  } catch {
    /*Ignore*/
  }
}

export function loadStops() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!raw || typeof raw !== "object") return null;

    const depot = isValidPoint(raw.depot) ? raw.depot : null;
    const stops = (Array.isArray(raw.stops) ? raw.stops : [])
      .filter(isValidPoint)
      .slice(0, MAX_STOPS)
      .map((s) => ({
        ...s,
        id: s.id ?? crypto.randomUUID(),
        name: s.name || "Unnamed stop",
      }));

    return { depot, stops };
  } catch {
    return null;
  }
}

export function clearStops() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /*Ignore*/
  }
}