import { useState } from "react";
import { Zap, Warehouse, ChevronDown, Loader2 } from "lucide-react";
import SearchBox from "./SearchBox";

const PARAM_FIELDS = [
  { key: "populationSize", label: "Fireflies", min: 15, max: 60, step: 1 },
  { key: "iterations", label: "Iterations", min: 50, max: 300, step: 10 },
  { key: "alpha", label: "α₀ (randomness)", min: 0, max: 1, step: 0.05 },
  { key: "beta0", label: "β₀ (attractiveness)", min: 0.1, max: 2, step: 0.1 },
  { key: "gamma", label: "γ (absorption)", min: 0.01, max: 2, step: 0.01 },
];

const DEFAULTS = { populationSize: 30, iterations: 120, alpha: 0.25, beta0: 1.0, gamma: 0.5 };

export default function ControlDrawer({
  presets,
  scenarioId,
  onSelectPreset,
  depot,
  maxStops,
  pendingIds,
  onSearchSelect,
  placingDepot,
  onTogglePlaceDepot,
  onClearAll,
  mode, onModeChange,
  params, onParamsChange,
  onRun, isRunning, hasDepot, stopCount,
  usedFallback, progress,
  children,
}) {
  const [advOpen, setAdvOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const canRun = hasDepot && stopCount >= 2 && !isRunning;
  const hint = !hasDepot
    ? "Set a depot to begin."
    : stopCount < 2
    ? "Add at least 2 stops to optimize."
    : `Finds the shortest loop across ${stopCount} stops.`;
  const pct = progress ? Math.min(100, (progress.iteration / params.iterations) * 100) : 0;

  return (
    <aside className={`fd-sheet${collapsed ? " collapsed" : ""}`}>
      <button
        className="fd-handle"
        aria-label={collapsed ? "Expand panel" : "Collapse panel"}
        onClick={() => setCollapsed((c) => !c)}
      />

      <header className="fd-head">
        <div className="fd-logo"><Zap size={22} fill="currentColor" /></div>
        <div className="fd-brand">
          <h1>Fire Fly</h1>
          <p>Dispatch · Metro Manila</p>
        </div>
        <span className="fd-pill">NCR</span>
      </header>

      <div className="fd-scroll">
        <div className="fd-searchwrap">
          <SearchBox onSelect={onSearchSelect} />
        </div>

        <section className="fd-card">
          <div className="fd-card-head"><h2 className="fd-eyebrow">Scenario</h2></div>
          <select
            id="scenario"
            className="fd-select"
            value={scenarioId}
            onChange={(e) => onSelectPreset(e.target.value)}
            aria-label="Scenario"
          >
            <option value="">Custom (click map to add stops)</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </section>

        <section className="fd-card">
          <div className="fd-card-head"><h2 className="fd-eyebrow">Depot</h2></div>
          <div className="fd-depot">
            <div className={`fd-ico${depot ? "" : " muted"}`}><Warehouse size={20} /></div>
            <div className="fd-depot-txt">
              <div className="fd-depot-name">
                {depot ? (pendingIds.has("depot") ? "Locating…" : depot.name) : "No depot set"}
              </div>
              <div className="fd-sub">
                {placingDepot
                  ? "Click the map to place it"
                  : depot
                  ? "Start and end of the route"
                  : "Where every route starts"}
              </div>
            </div>
            <button
              type="button"
              className={`fd-btn2${placingDepot ? " active" : ""}`}
              onClick={onTogglePlaceDepot}
            >
              {placingDepot ? "Cancel" : depot ? "Move" : "Set on map"}
            </button>
          </div>
        </section>

        <section className="fd-card">
          <div className="fd-card-head">
            <h2 className="fd-eyebrow">Stops</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="fd-count">{stopCount}/{maxStops}</span>
              <button
                type="button"
                className="fd-link"
                onClick={onClearAll}
                disabled={!depot && stopCount === 0}
              >
                Clear all
              </button>
            </div>
          </div>
          {stopCount === 0 ? (
            <div className="fd-empty">
              <div className="fd-ico muted"><Warehouse size={20} /></div>
              <strong>No stops yet</strong>
              <span>Click the map, search an address, or pick a scenario.</span>
            </div>
          ) : (
            children /* StopManifest renders here */
          )}
        </section>

        <section className="fd-card">
          <div className="fd-card-head"><h2 className="fd-eyebrow">Distance source</h2></div>
          <div className="fd-seg" role="group" aria-label="Distance source">
            <button type="button" aria-pressed={mode === "osrm"} onClick={() => onModeChange("osrm")}>
              Real roads
            </button>
            <button type="button" aria-pressed={mode === "haversine"} onClick={() => onModeChange("haversine")}>
              Straight-line
            </button>
          </div>
          {usedFallback && mode === "osrm" && (
            <div className="fd-note">Fallback: road routing unavailable, using straight-line distances.</div>
          )}

          <button
            type="button"
            className="fd-adv-toggle"
            aria-expanded={advOpen}
            onClick={() => setAdvOpen((o) => !o)}
          >
            Algorithm settings <ChevronDown size={16} />
          </button>
          {advOpen && (
            <>
              {PARAM_FIELDS.map((f) => (
                <div className="fd-slider" key={f.key}>
                  <label htmlFor={`p-${f.key}`}>{f.label}</label>
                  <output htmlFor={`p-${f.key}`}>{params[f.key]}</output>
                  <input
                    id={`p-${f.key}`}
                    type="range"
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={params[f.key]}
                    onChange={(e) => onParamsChange({ ...params, [f.key]: Number(e.target.value) })}
                  />
                </div>
              ))}
              <button
                type="button"
                className="fd-link"
                style={{ marginTop: 12 }}
                onClick={() => onParamsChange({ ...DEFAULTS })}
              >
                Reset to defaults
              </button>
            </>
          )}
        </section>

      </div>

      <footer className="fd-foot">
        <button className="fd-cta" onClick={onRun} disabled={!canRun}>
          {isRunning ? (
            <><Loader2 size={20} className="fd-spin" /> Optimizing… {Math.round(pct)}%</>
          ) : (
            <><Zap size={20} fill="currentColor" /> Optimize route</>
          )}
        </button>
        {isRunning ? (
          <div className="fd-progress"><i style={{ width: `${pct}%` }} /></div>
        ) : (
          <p className="fd-hint">{hint}</p>
        )}
      </footer>
    </aside>
  );
}