import { useEffect, useState } from "react";
import MapView from "./components/MapView";
import ControlDrawer from "./components/ControlDrawer";
import presets from "./data/ncrPresets.json";
import { loadStops, saveStops, clearStops } from "./utils/storage";
import { isWithinMetroManila } from "./utils/geofence";

const MAX_STOPS = 40;

export default function App() {
  // Lazy init: read localStorage exactly once, before the first render
  const [saved] = useState(() => loadStops() ?? { depot: null, stops: [] });
  const [depot, setDepot] = useState(saved.depot);
  const [stops, setStops] = useState(saved.stops);
  const [scenarioId, setScenarioId] = useState("");
  const [placingDepot, setPlacingDepot] = useState(false);
  const [fitTrigger, setFitTrigger] = useState(0);

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

  function handleMapClick({ lat, lng }) {
    if (!isWithinMetroManila(lat, lng)) {
      notify("Delivery stops are restricted to Metro Manila (NCR).");
      return;
    }
    if (placingDepot) {
      setDepot({ name: "Custom Depot", lat, lng });
      setPlacingDepot(false);
      setScenarioId("");
      return;
    }
    if (stops.length >= MAX_STOPS) {
      notify(`Maximum of ${MAX_STOPS} stops reached.`);
      return;
    }
    setStops((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: `Stop ${prev.length + 1}`, lat, lng },
    ]);
    setScenarioId("");
  }

  function handleSelectPreset(id) {
    setScenarioId(id);
    setPlacingDepot(false);
    if (!id) return; // "Custom" keeps whatever is on the map

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

  return (
    <div className={placingDepot ? "placing-depot" : ""}>
      <MapView
        depot={depot}
        stops={stops}
        onAddStop={handleMapClick}
        onOutOfBounds={notify}
        fitTrigger={fitTrigger}
      />
      <ControlDrawer
        presets={presets}
        scenarioId={scenarioId}
        onSelectPreset={handleSelectPreset}
        depot={depot}
        stops={stops}
        maxStops={MAX_STOPS}
        placingDepot={placingDepot}
        onTogglePlaceDepot={() => setPlacingDepot((v) => !v)}
        onRemoveStop={handleRemoveStop}
        onClearAll={handleClearAll}
      />
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}