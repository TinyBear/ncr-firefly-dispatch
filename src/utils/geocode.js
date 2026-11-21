const cache = new Map();
let chain = Promise.resolve();
let lastCall = 0;
const MIN_GAP_MS = 1100;
const BASE = "https://nominatim.openstreetmap.org";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Run fetch tasks one at a time, at least MIN_GAP_MS apart
function enqueue(fn) {
  const task = chain.then(async () => {
    const wait = Math.max(0, lastCall + MIN_GAP_MS - Date.now());
    if (wait) await sleep(wait);
    lastCall = Date.now();
    return fn();
  });
  chain = task.catch(() => {}); 
  return task;
}

function formatLabel(data) {
  const a = data.address ?? {};
  const street = a.road ? [a.house_number, a.road].filter(Boolean).join(" ") : null;
  const place = data.name && data.name !== a.road ? data.name : null;
  const first = place || street;
  const area = a.suburb || a.neighbourhood || a.quarter || a.village || a.city_district;
  const city = a.city || a.town || a.municipality;
  const parts = [...new Set([first, area, city].filter(Boolean))];
  if (parts.length) return parts.join(", ");
  return data.display_name ? data.display_name.split(",").slice(0, 3).join(",").trim() : null;
}

export function reverseGeocode(lat, lng) {
  const key = `r:${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key));

  return enqueue(async () => {
    const url =
      `${BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lng}` +
      `&zoom=18&addressdetails=1&accept-language=en`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Reverse geocode failed (${res.status})`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const label = formatLabel(data);
    if (label) cache.set(key, label);
    return label;
  });
}

// viewbox = left,top,right,bottom (lon_min,lat_max,lon_max,lat_min) = NCR box
export function searchPlaces(query) {
  const q = query.trim();
  if (!q) return Promise.resolve([]);
  const key = `s:${q.toLowerCase()}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key));

  return enqueue(async () => {
    const url =
      `${BASE}/search?format=jsonv2&q=${encodeURIComponent(q)}` +
      `&countrycodes=ph&viewbox=120.88,14.82,121.15,14.32&bounded=1` +
      `&limit=5&addressdetails=1&accept-language=en`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Search failed (${res.status})`);
    const data = await res.json();
    const results = data.map((d) => ({
      id: d.place_id,
      name: formatLabel(d) ?? d.display_name,
      detail: d.display_name,
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon),
    }));
    cache.set(key, results);
    return results;
  });
}