// National Capital Region (Metro Manila) bounding box
export const NCR_CENTER = [14.5853, 121.0223]; // Mandaluyong / Shaw Blvd midpoint

export const NCR_BOUNDS = [
  [14.32, 120.88], // Southwest (Muntinlupa / Las Piñas / Manila Bay)
  [14.82, 121.15], // Northeast (North Caloocan / Marikina / Valenzuela)
];

export function isWithinMetroManila(lat, lng) {
  const [[minLat, minLng], [maxLat, maxLng]] = NCR_BOUNDS;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

// Public OSRM stays fast and within limits at this size
export const MAX_STOPS = 40;

export function isValidPoint(p) {
  return (
    !!p &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    isWithinMetroManila(p.lat, p.lng)
  );
}

// Returns an error message, or null if the stop can be added
export function validateNewStop(currentCount, lat, lng) {
  if (currentCount >= MAX_STOPS) {
    return `Maximum of ${MAX_STOPS} stops reached.`;
  }
  if (!isWithinMetroManila(lat, lng)) {
    return "Delivery stops are restricted to Metro Manila (NCR).";
  }
  return null;
}