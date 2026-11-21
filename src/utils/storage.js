import { isWithinMetroManila } from "./geofence";

const KEY = "ncr-firefly-stops-v1";

const isValidPoint = (p) =>
  p &&
  typeof p.lat === "number" &&
  typeof p.lng === "number" &&
  isWithinMetroManila(p.lat, p.lng);

export function saveStops(depot, stops) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ depot, stops }));
  } catch {
    /* storage full or blocked: fail silently */
  }
}

export function loadStops() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!raw) return null;
    return {
      depot: isValidPoint(raw.depot) ? raw.depot : null,
      stops: Array.isArray(raw.stops) ? raw.stops.filter(isValidPoint) : [],
    };
  } catch {
    return null;
  }
}

export function clearStops() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}