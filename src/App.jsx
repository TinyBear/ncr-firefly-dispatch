import { useEffect, useRef, useState } from "react"; // PHASE 6: added useRef
import MapView from "./components/MapView";
import ControlDrawer from "./components/ControlDrawer";
import presets from "./data/ncrPresets.json";
import { loadStops, saveStops, clearStops } from "./utils/storage";
import { isWithinMetroManila } from "./utils/geofence";
import { reverseGeocode } from "./utils/geocode";
// PHASE 6
import {
  buildHaversineMatrix,
  fetchOsrmMatrix,
  fetchOsrmRouteGeometry,
} from "./algorithms/distance";
import TelemetryBar from "./components/TelemetryBar";
import StopManifest from "./components/StopManifest";

const MAX_STOPS = 40;

// PHASE 6
const DEFAULT_PARAMS = {
  populationSize: 30,
  iterations: 120,
  alpha: 0.25,
  beta0: 1.0,
  gamma: 0.5,
};

export default function App() {
  // Lazy init: read localStorage exactly once, before the first render
  const [saved] = useState(() => loadStops() ?? { depot: null, stops: [] });
  const [depot, setDepot] = useState(saved.depot);
  const [stops, setStops] = useState(saved.stops);
  const [scenarioId, setScenarioId] = useState("");
  const [placingDepot, setPlacingDepot] = useState(false);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const [focusTarget, setFocusTarget] = useState(null);

  // PHASE 6: optimizer state
  const [mode, setMode] = useState("osrm"); // "osrm" | "haversine"
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [status, setStatus] = useState("idle"); // idle | matrix | optimizing | routing | done
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const workerRef = useRef(null);
  const runIdRef = useRef(0); // lets us ignore results from superseded runs

  const canRun = Boolean(depot) && stops.length >= 2;

  // Replace this with your Phase 3 toast. It must accept a message string.
  const [toastMsg, setToastMsg] = useState("");
  const notify = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Persist on every change
  useEffect(() => {
    saveStops(depot, stops);
  }, [depot, stops]);

  // PHASE 6: terminate the worker when App unmounts
  useEffect(() => () => workerRef.current?.terminate(), []);

    // PHASE 6: clear results only when coordinates change (not on rename / geocoded names)
  const layoutSig = JSON.stringify([
    depot && [depot.lat, depot.lng],
    stops.map((s) => [s.lat, s.lng]),
  ]);

  // Reset derived UI state during render (React's recommended pattern; no effect needed)
  const [prevSig, setPrevSig] = useState(layoutSig);
  if (prevSig !== layoutSig) {
    setPrevSig(layoutSig);
    setResult(null);
    setProgress(null);
    setUsedFallback(false);
    setStatus("idle");
  }

  // Effects are for external systems: stop any in-flight run and its worker
  useEffect(() => {
    runIdRef.current++; // makes any pending async callbacks ignore their results
    workerRef.current?.terminate();
  }, [layoutSig]);

  function resolveName(id, lat, lng, apply) {
  setPendingIds((prev) => new Set(prev).add(id));
  reverseGeocode(lat, lng)
    .then((label) => {
      if (label) apply(label);
    })
    .catch(() => {}) // keep the fallback name
    .finally(() =>
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      })
    );
}

  function placePoint({ lat, lng, name }) {
    if (!isWithinMetroManila(lat, lng)) {
      notify("Delivery stops are restricted to Metro Manila (NCR).");
      return false;
    }
    if (placingDepot) {
      setDepot({ name: name ?? "Custom Depot", lat, lng });
      setPlacingDepot(false);
      setScenarioId("");
      if (!name) {
        resolveName("depot", lat, lng, (label) =>
          setDepot((d) =>
            d && d.lat === lat && d.lng === lng ? { ...d, name: label } : d,
          ),
        );
      }
      return true;
    }
    if (stops.length >= MAX_STOPS) {
      notify(`Maximum of ${MAX_STOPS} stops reached.`);
      return false;
    }
    const id = crypto.randomUUID();
    setStops((prev) => [
      ...prev,
      { id, name: name ?? `Stop ${prev.length + 1}`, lat, lng },
    ]);
    setScenarioId("");
    if (!name) {
      resolveName(id, lat, lng, (label) =>
        setStops((prev) =>
          prev.map((s) => (s.id === id ? { ...s, name: label } : s)),
        ),
      );
    }
    return true;
  }

  const handleMapClick = (point) => placePoint(point);

  function handleSearchSelect(result) {
    if (placePoint(result)) {
      setFocusTarget({ lat: result.lat, lng: result.lng, key: Date.now() });
    }
  }

  function handleSelectPreset(id) {
    setScenarioId(id);
    setPlacingDepot(false);
    if (!id) return; 

    const preset = presets.find((p) => p.id === id);
    if (!preset) return;

    setDepot(preset.depot);
    setStops(
      preset.stops
        .filter((s) => isWithinMetroManila(s.lat, s.lng))
        .map((s) => ({ id: crypto.randomUUID(), ...s }))
    );
    setFitTrigger((n) => n + 1);
  }

  function handleRemoveStop(id) {
    setStops((prev) => prev.filter((s) => s.id !== id));
    setScenarioId("");
  }

  function handleClearAll() {
    setDepot(null);
    setStops([]);
    setScenarioId("");
    setPlacingDepot(false);
    clearStops();
  }

  // PHASE 6: rename helper (used by StopManifest in Step 5)
  const handleRenameStop = (id, name) =>
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));

  // PHASE 6: run handler 
  async function handleRun() {
    if (!canRun) return;

    const runId = ++runIdRef.current;
    workerRef.current?.terminate();
    setResult(null);
    setProgress(null);
    setUsedFallback(false);

    const points = [depot, ...stops];
    let fellBack = false;
    let distMatrix;

    // 1) Distance matrix (OSRM request #1, or Haversine)
    setStatus("matrix");
    if (mode === "osrm") {
      try {
        distMatrix = await fetchOsrmMatrix(points);
      } catch {
        distMatrix = buildHaversineMatrix(points);
        fellBack = true;
      }
    } else {
      distMatrix = buildHaversineMatrix(points);
    }
    if (runId !== runIdRef.current) return; // superseded while fetching
    const useRoads = mode === "osrm" && !fellBack;

    // 2) Firefly in the worker (0 HTTP calls)
    setStatus("optimizing");
    const worker = new Worker(
      new URL("./workers/optimizer.worker.js", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;

    worker.onerror = () => {
      if (runId !== runIdRef.current) return;
      setStatus("idle");
      notify("Optimizer crashed. Check the console.");
    };

    worker.onmessage = async (event) => {
      if (runId !== runIdRef.current) return;
      const { type, payload } = event.data;

      if (type === "PROGRESS") {
        setProgress(payload);
        return;
      }
      if (type === "ERROR") {
        setStatus("idle");
        notify(`Optimizer error: ${payload}`);
        return;
      }
      if (type !== "COMPLETE") return;

      worker.terminate();
      const { bestRoute, bestDistance, history, baseline, elapsedMs } = payload;

      // 3) Street geometry (OSRM request #2) or straight lines
      setStatus("routing");
      const ordered = bestRoute.map((i) => points[i]);
      const baselineOrdered = baseline.route.map((i) => points[i]);
      let routePolyline = ordered.map((p) => [p.lat, p.lng]);

      if (useRoads) {
        try {
          routePolyline = await fetchOsrmRouteGeometry(ordered);
        } catch {
          fellBack = true;
        }
      }
      if (runId !== runIdRef.current) return;

      const baselinePolyline = baselineOrdered.map((p) => [p.lat, p.lng]);
      const savedPct =
        baseline.distance > 0
          ? ((baseline.distance - bestDistance) / baseline.distance) * 100
          : 0;

      setUsedFallback(fellBack);
      setResult({
        bestRoute,
        bestDistance,
        baselineDistance: baseline.distance,
        savedPct,
        elapsedMs,
        history,
        routePolyline,
        baselinePolyline,
        source:
          mode === "osrm" && !fellBack
            ? "OSRM (road network)"
            : "Haversine (straight-line)",
      });
      setStatus("done");
    };

    // options holds only primitives, so it is safe to structured-clone
    worker.postMessage({ distMatrix, options: params });
  }

  return (
    <div className={placingDepot ? "placing-depot" : ""}>
      <MapView
        depot={depot}
        stops={stops}
        onAddStop={handleMapClick}
        onOutOfBounds={notify}
        fitTrigger={fitTrigger}
        focusTarget={focusTarget}
        optimizedOrder={result?.bestRoute} // PHASE 6
        routePolyline={result?.routePolyline} // PHASE 6
        baselinePolyline={result?.baselinePolyline} // PHASE 6
      />
      <ControlDrawer
        presets={presets}
        scenarioId={scenarioId}
        onSelectPreset={handleSelectPreset}
        depot={depot}
        stops={stops}
        maxStops={MAX_STOPS}
        pendingIds={pendingIds}
        placingDepot={placingDepot}
        onTogglePlaceDepot={() => setPlacingDepot((v) => !v)}
        onRemoveStop={handleRemoveStop}
        onClearAll={handleClearAll}
        onSearchSelect={handleSearchSelect}
        // PHASE 6 (consumed once you finish Step 3)
        mode={mode}
        onModeChange={setMode}
        params={params}
        onParamsChange={setParams}
        onRun={handleRun}
        status={status}
        canRun={canRun}
        usedFallback={usedFallback}
        progress={progress}
      >
        {
          <StopManifest
            depot={depot}
            stops={stops}
            result={result}
            onRename={handleRenameStop}
            onDelete={handleRemoveStop  }
          />
        }
      </ControlDrawer>

      <TelemetryBar result={result} /> {
        toastMsg && <div className="toast">{toastMsg}</div>
      }
      
    </div>
  );
}