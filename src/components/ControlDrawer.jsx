import SearchBox from "./SearchBox";

const PARAM_FIELDS = [
  { key: "populationSize", label: "Fireflies", min: 15, max: 60, step: 1 },
  { key: "iterations", label: "Iterations", min: 50, max: 300, step: 10 },
  { key: "alpha", label: "α₀ (randomness)", min: 0, max: 1, step: 0.05 },
  { key: "beta0", label: "β₀ (attractiveness)", min: 0.1, max: 2, step: 0.1 },
  { key: "gamma", label: "γ (absorption)", min: 0.01, max: 2, step: 0.01 },
];

const RUN_LABELS = {
  idle: "Run Optimization",
  done: "Run Again",
  matrix: "Fetching distances…",
  optimizing: "Optimizing…",
  routing: "Drawing route…",
};

export default function ControlDrawer({
  presets,
  scenarioId,
  onSelectPreset,
  depot,
  stops,
  maxStops,
  pendingIds,
  onSearchSelect, 
  placingDepot,
  onTogglePlaceDepot,
  onRemoveStop,
  onClearAll,
  mode, onModeChange,
  params, onParamsChange,
  onRun, status, canRun,
  usedFallback, progress,
  children,
}) {
  const busy = ["matrix", "optimizing", "routing"].includes(status);
  return (
    <aside className="drawer">
      <header className="drawer-header">
        <h1 className="drawer-title">Fire Fly Dispatch</h1>
        <p className="drawer-sub">Metro Manila (NCR) route optimizer</p>
      </header>

      <SearchBox onSelect={onSearchSelect} />

      <section className="drawer-section">
        <label className="field-label" htmlFor="scenario">Scenario</label>
        <select
          id="scenario"
          className="field-select"
          value={scenarioId}
          onChange={(e) => onSelectPreset(e.target.value)}
        >
          <option value="">Custom (click map to add stops)</option>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </section>

      <section className="ff-section">
        <div className="ff-label">Distance source</div>
        <div className="ff-seg" role="group" aria-label="Distance source">
          <button
            type="button"
            className={mode === "osrm" ? "active" : ""}
            onClick={() => onModeChange("osrm")}
          >
            Real Roads (OSRM)
          </button>
          <button
            type="button"
            className={mode === "haversine" ? "active" : ""}
            onClick={() => onModeChange("haversine")}
          >
            Straight-Line (Haversine)
          </button>
        </div>
        {usedFallback && mode === "osrm" && (
          <span className="ff-badge">Fallback: straight-line distances</span>
        )}
      </section>

      <details className="ff-section">
        <summary className="ff-label">Algorithm parameters</summary>
        {PARAM_FIELDS.map((f) => (
          <label key={f.key} className="ff-field">
            <span>{f.label}</span>
            <input
              type="range"
              min={f.min}
              max={f.max}
              step={f.step}
              value={params[f.key]}
              onChange={(e) =>
                onParamsChange({ ...params, [f.key]: Number(e.target.value) })
              }
            />
            <span className="ff-mono">{params[f.key]}</span>
          </label>
        ))}
      </details>

      <section className="ff-section">
        <button className="ff-run" disabled={!canRun || busy} onClick={onRun}>
          {RUN_LABELS[status] ?? "Run Optimization"}
        </button>
        {!canRun && (
          <p className="ff-hint">Set a depot and add at least 2 stops to run.</p>
        )}
        {busy && progress && (
          <p className="ff-hint ff-mono">
            Iter {progress.iteration}/{params.iterations} ·{" "}
            {progress.bestDistance.toFixed(2)} km
          </p>
        )}
      </section>

      {children /* StopManifest renders here */}

      <section className="drawer-section">
        <div className="row-between">
          <span className="field-label">Depot</span>
          <button
            type="button"
            className={placingDepot ? "btn btn-active" : "btn"}
            onClick={onTogglePlaceDepot}
          >
            {placingDepot ? "Click map to place…" : depot ? "Move depot" : "Set depot"}
          </button>
        </div>
        <p className="depot-name">
          {depot ? (pendingIds.has("depot") ? "Locating…" : depot.name) : "No depot set"}
        </p>
      </section>

      <section className="drawer-section">
        <div className="row-between">
          <span className="field-label">
            Stops <span className="mono">{stops.length}/{maxStops}</span>
          </span>
          <button
            type="button"
            className="btn"
            onClick={onClearAll}
            disabled={!depot && stops.length === 0}
          >
            Clear all
          </button>
        </div>

        {stops.length === 0 ? (
          <p className="empty-note">Click the map to drop delivery stops, or pick a scenario.</p>
        ) : (
          <ol className="stop-list">
            {stops.map((s, i) => (
              <li key={s.id} className="stop-row">
                <span className="stop-index mono">{i + 1}</span>
                <span className="stop-name" title={s.name}>
                  {pendingIds.has(s.id) ? "Locating…" : s.name}
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Remove ${s.name}`}
                  onClick={() => onRemoveStop(s.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </aside>
  );
}