// Prevents the UI from hanging if public OSRM stalls; the caller falls back to Haversine.
async function fetchWithTimeout(url, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Haversine distance in kilometers between two { lat, lng } points
export function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function buildHaversineMatrix(points) {
  const n = points.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) matrix[i][j] = haversineKm(points[i], points[j]);
    }
  }
  return matrix;
}

// Fetch real road distance matrix (in km) from OSRM in a single request
export async function fetchOsrmMatrix(points) {
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=distance`;
  const res = await fetchWithTimeout(url, 8000);
  if (!res.ok) throw new Error("OSRM table request failed");
  const data = await res.json();
  if (
    data.code !== "Ok" ||
    !data.distances ||
    data.distances.length !== points.length
  ) {
    throw new Error("Invalid OSRM table response");
  }
  // Convert meters to kilometers
  return data.distances.map((row) => row.map((d) => (d ?? 1e6) / 1000));
}

// Fetch exact street-level polyline coordinates for the final ordered route
export async function fetchOsrmRouteGeometry(orderedPoints) {
  const coords = orderedPoints.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const res = await fetchWithTimeout(url, 10000);
  if (!res.ok) throw new Error("OSRM route request failed");
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.[0]) {
    throw new Error("Invalid OSRM route response");
  }
  // Convert GeoJSON [lng, lat] back to Leaflet [lat, lng]
  return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
}