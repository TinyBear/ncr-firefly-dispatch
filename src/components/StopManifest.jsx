import { Trash2 } from "lucide-react";
import { isWithinMetroManila } from "../utils/geofence";

function download(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export default function StopManifest({ depot, stops, result, onRename, onDelete }) {
  if (!depot && stops.length === 0) return null;

  // Optimized order when a result exists, otherwise insertion order
  const rows = (
    result
      ? result.bestRoute.slice(1, -1).map((idx, k) => ({ seq: k + 1, stop: stops[idx - 1] }))
      : stops.map((stop, k) => ({ seq: k + 1, stop }))
  ).filter((r) => r.stop); // guards the render between a delete and the result reset

  function exportJson() {
    const manifest = {
      generatedAt: new Date().toISOString(),
      distanceSource: result.source,
      totalDistanceKm: +result.bestDistance.toFixed(3),
      baselineDistanceKm: +result.baselineDistance.toFixed(3),
      savedPercent: +result.savedPct.toFixed(2),
      depot: { name: depot.name, lat: depot.lat, lng: depot.lng },
      route: rows.map(({ seq, stop }) => ({
        sequence: seq,
        name: stop.name,
        lat: stop.lat,
        lng: stop.lng,
      })),
    };
    download("ncr-dispatch-manifest.json", JSON.stringify(manifest, null, 2), "application/json");
  }

  function exportCsv() {
    const lines = [
      [0, depot.name, depot.lat, depot.lng],
      ...rows.map(({ seq, stop }) => [seq, stop.name, stop.lat, stop.lng]),
      [rows.length + 1, `${depot.name} (return)`, depot.lat, depot.lng],
    ].map((r) => r.map(csvCell).join(","));
    // BOM so Excel renders "Parañaque" / "Las Piñas" correctly
    const csv = "\uFEFF" + ["sequence,name,latitude,longitude", ...lines].join("\r\n");
    download("ncr-dispatch-manifest.csv", csv, "text/csv;charset=utf-8");
  }

  return (
    <section className="ff-section">
      <div className="ff-label">
        {result ? "Dispatch manifest (optimized)" : "Stops"} · {rows.length}
      </div>

      {rows.map(({ seq, stop }) => (
        <div className="ff-row" key={stop.id}>
          <span className="ff-seq">{seq}</span>
          <input
            id={`stop-name-${stop.id}`}
            name={`stop-name-${stop.id}`}
            autoComplete="off"
            value={stop.name}
            onChange={(e) => onRename(stop.id, e.target.value)}
            aria-label={`Rename stop ${seq}`}
          />
          <span
            className={`ff-geo ${isWithinMetroManila(stop.lat, stop.lng) ? "" : "bad"}`}
            title="NCR geofence check"
          >
            {isWithinMetroManila(stop.lat, stop.lng) ? "NCR ✓" : "Outside NCR"}
          </span>
          <button
            className="ff-icon-btn"
            onClick={() => onDelete(stop.id)}
            aria-label={`Delete stop ${seq}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <div className="ff-export">
        <button disabled={!result} onClick={exportJson}>Export JSON</button>
        <button disabled={!result} onClick={exportCsv}>Export CSV</button>
      </div>
    </section>
  );
}