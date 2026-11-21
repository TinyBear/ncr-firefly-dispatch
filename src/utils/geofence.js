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