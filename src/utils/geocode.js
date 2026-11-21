const cache = new Map();
let chain = Promise.resolve();
let lastCall = 0;
const MIN_GAP_MS = 1100; // Nominatim public limit: max 1 request/second

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function formatLabel(data) {
  const a = data.address ?? {};
  const street = a.road ? [a.house_number, a.road].filter(Boolean).join(" ") : null;
  const place = data.name && data.name !== a.road ? data.name : null; // POI/building name
  const first = place || street;
  const area = a.suburb || a.neighbourhood || a.quarter || a.village || a.city_district;
  const city = a.city || a.town || a.municipality;
  const parts = [...new Set([first, area, city].filter(Boolean))];
  if (parts.length) return parts.join(", ");
  return data.display_name ? data.display_name.split(",").slice(0, 3).join(",").trim() : null;
}

export function reverseGeocode(lat, lng) {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key));

  const task = chain.then(async () => {
    const wait = Math.max(0, lastCall + MIN_GAP_MS - Date.now());
    if (wait) await sleep(wait);
    lastCall = Date.now();

    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Reverse geocode failed (${res.status})`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const label = formatLabel(data);
    if (label) cache.set(key, label);
    return label;
  });

  chain = task.catch(() => {}); // a failure must not block later lookups
  return task;
}