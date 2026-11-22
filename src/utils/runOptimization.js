import {
  buildHaversineMatrix,
  fetchOsrmMatrix,
  fetchOsrmRouteGeometry,
} from "../algorithms/distance";

const toLatLng = (p) => [p.lat, p.lng];

export function startOptimization({ depot, stops, useRoads, options, onProgress }) {
  let worker = null;
  let cancelled = false;
  let rejectWorker = null;

  const promise = (async () => {
    const points = [depot, ...stops];
    let usedFallback = false;
    let distMatrix;

    if (useRoads) {
      try {
        distMatrix = await fetchOsrmMatrix(points);
      } catch (err) {
        console.warn("OSRM matrix failed, using Haversine:", err);
        usedFallback = true;
        distMatrix = buildHaversineMatrix(points);
      }
    } else {
      distMatrix = buildHaversineMatrix(points);
    }
    if (cancelled) throw new Error("CANCELLED");

    const result = await new Promise((resolve, reject) => {
      rejectWorker = reject;
      worker = new Worker(
        new URL("../workers/optimizer.worker.js", import.meta.url),
        { type: "module" }
      );
      worker.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === "PROGRESS") onProgress?.(payload);
        if (type === "COMPLETE") resolve(payload);
      };
      worker.onerror = (e) => reject(new Error(e.message || "Worker failed"));
      worker.postMessage({ distMatrix, options });
    });
    worker?.terminate();
    worker = null;
    if (cancelled) throw new Error("CANCELLED");

    const orderedPoints = result.bestRoute.map((i) => points[i]);
    const baselinePoints = result.baseline.route.map((i) => points[i]);

    let routePolyline = orderedPoints.map(toLatLng);
    if (useRoads && !usedFallback) {
      try {
        routePolyline = await fetchOsrmRouteGeometry(orderedPoints);
      } catch (err) {
        console.warn("OSRM route failed, drawing straight lines:", err);
        usedFallback = true;
      }
    }
    if (cancelled) throw new Error("CANCELLED");

    return {
      ...result,
      orderedPoints,
      routePolyline,
      baselinePolyline: baselinePoints.map(toLatLng),
      usedFallback,
    };
  })();

  const cancel = () => {
    cancelled = true;
    worker?.terminate();
    worker = null;
    rejectWorker?.(new Error("CANCELLED"));
  };

  return { promise, cancel };
}