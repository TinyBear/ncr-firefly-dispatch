import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapView from "./components/MapView";
import ControlDrawer from "./components/ControlDrawer";
import presets from "./data/ncrPresets.json";
import { loadStops, saveStops, clearStops } from "./utils/storage";
import { isWithinMetroManila } from "./utils/geofence";
import { startOptimization } from "./utils/runOptimization";
import { validateNewStop } from "./utils/geofence";
import { reverseGeocode } from "./utils/geocode";
// PHASE 6
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
  const runRef = useRef(null);

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
    if (placingDepot) {
      if (!isWithinMetroManila(lat, lng)) {
        notify("Delivery stops are restricted to Metro Manila (NCR).");
        return false;
      }
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
    const err = validateNewStop(stops.length, lat, lng);
    if (err) {
      notify(err);
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

  const handleMapClick = (point) => {
    const { lat, lng } = point;
    const error = validateNewStop(stops.length, lat, lng);
    if (error) {
      notify(error);
      return;
    }
    placePoint(point);
  };

  function handleSearchSelect(result) {
    const error = validateNewStop(stops.length, result.lat, result.lng);
    if (error) {
      notify(error);
      return;
    }
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
  const handleRun = useCallback(async () => {
    if (!depot) {
      notify("Set a depot first.");
      return;
    }
    if (stops.length < 2) {
      notify("Add at least 2 delivery stops to optimize.");
      return;
    }

    runRef.current?.cancel();
    setStatus("optimizing");
    setResult(null);
    setProgress(null);
    setUsedFallback(false);

    const run = startOptimization({
      depot,
      stops,
      useRoads: mode === "osrm",
      options: params,
      onProgress: setProgress,
    });
    runRef.current = run;

    try {
      const out = await run.promise;
      if (runRef.current !== run) return;
      const savedPct =
        out.baseline.distance > 0
          ? ((out.baseline.distance - out.bestDistance) /
              out.baseline.distance) *
            100
          : 0;
      setResult({
        ...out,
        baselineDistance: out.baseline.distance,
        savedPct,
        source:
          mode === "osrm" && !out.usedFallback
            ? "OSRM (road network)"
            : "Haversine (straight-line)",
      });
      setUsedFallback(out.usedFallback);
      setStatus("done");
      if (out.usedFallback && mode === "osrm") {
        notify("Road routing unavailable. Using straight-line distances.");
      }
    } catch (err) {
      if (err.message !== "CANCELLED") {
        console.error(err);
        notify("Optimization failed. Please try again.");
        setStatus("idle");
      }
    } finally {
      if (runRef.current === run) {
        runRef.current = null;
      }
    }
  }, [depot, stops, mode, params]);

  // 5c: cancel any in-flight run when App unmounts
  useEffect(() => () => runRef.current?.cancel(), []);

  // 5d: clear stale results when coordinates change (not on rename / geocoded names)
  const coordKey = useMemo(
    () =>
      [depot, ...stops]
        .map((p) => (p ? `${p.lat.toFixed(6)},${p.lng.toFixed(6)}` : "none"))
        .join("|"),
    [depot, stops],
  );

  const [prevCoordKey, setPrevCoordKey] = useState(coordKey);
  if (prevCoordKey !== coordKey) {
    setPrevCoordKey(coordKey);
    setStatus("idle");
    setResult(null);
    setProgress(null);
  }

  useEffect(() => {
    runRef.current?.cancel();
    runRef.current = null;
  }, [coordKey]);

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
        isRunning={status === "optimizing"}
        hasDepot={Boolean(depot)}
        stopCount={stops.length}
        usedFallback={usedFallback}
        progress={progress}
      >
        {
          <StopManifest
            depot={depot}
            stops={stops}
            result={result}
            pendingIds={pendingIds}
            onRename={handleRenameStop}
            onDelete={handleRemoveStop}
          />
        }
      </ControlDrawer>
      <TelemetryBar result={result} />
      {toastMsg && (
        <div className="fd-toast" role="status">
          {toastMsg}
        </div>
      )}
    </div>
  );
}