import { useState, useCallback } from "react";
import MapView from "./components/MapView";
import Toast from "./components/Toast";

export default function App() {
  const [depot] = useState(null);
  const [stops, setStops] = useState([]);
  const [toast, setToast] = useState("");

  const handleAddStop = useCallback(({ lat, lng }) => {
    setStops((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: `Stop ${prev.length + 1}`,
        lat,
        lng,
      },
    ]);
  }, []);

  const handleOutOfBounds = useCallback((msg) => setToast(msg), []);
  const clearToast = useCallback(() => setToast(""), []);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <MapView
        depot={depot}
        stops={stops}
        optimizedOrder={null}
        routePolyline={null}
        baselinePolyline={null}
        onAddStop={handleAddStop}
        onOutOfBounds={handleOutOfBounds}
      />
      <Toast message={toast} onClose={clearToast} />
    </div>
  );
}