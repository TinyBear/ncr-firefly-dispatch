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

export default function StopManifest({ depot, stops, result, onRename, onDelete, pendingIds }) {
  if (stops.length === 0) return null; // ControlDrawer shows the empty state

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
    <>
      <ol className="fd-list">
        {depot && (
          <li className="fd-row">
            <span className="fd-dot hub">H</span>
            <div>
              <div className="fd-row-name">{pendingIds?.has("depot") ? "Locating…" : depot.name}</div>
              <div className="fd-sub">{result ? "Depart" : "Depot"}</div>
            </div>
            <span />
          </li>
        )}

        {rows.map(({ seq, stop }) => {
          const inside = isWithinMetroManila(stop.lat, stop.lng);
          return (
            <li className="fd-row" key={stop.id}>
              <span className={`fd-dot${result ? "" : " idle"}`}>{seq}</span>
              <div style={{ minWidth: 0 }}>
                <input
                  id={`stop-name-${stop.id}`}
                  name={`stop-name-${stop.id}`}
                  className="fd-edit"
                  autoComplete="off"
                  value={stop.name}
                  onChange={(e) => onRename(stop.id, e.target.value)}
                  aria-label={`Rename stop ${seq}`}
                />
                {pendingIds?.has(stop.id) && <div className="fd-sub" style={{ paddingLeft: 8 }}>Locating address…</div>}
                {!inside && <div className="fd-warn" title="NCR geofence check">Outside NCR</div>}
              </div>
              <button
                className="fd-icon-btn"
                onClick={() => onDelete(stop.id)}
                aria-label={`Delete stop ${seq}`}
              >
                <Trash2 size={15} />
              </button>
            </li>
          );
        })}

        {result && depot && (
          <li className="fd-row">
            <span className="fd-dot hub">H</span>
            <div>
              <div className="fd-row-name">Return to hub</div>
              <div className="fd-sub">{depot.name}</div>
            </div>
            <span />
          </li>
        )}
      </ol>

      <div className="fd-export">
        <button className="fd-btn2" disabled={!result} onClick={exportJson}>Export JSON</button>
        <button className="fd-btn2" disabled={!result} onClick={exportCsv}>Export CSV</button>
      </div>
    </>
  );
}