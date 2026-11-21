export default function ControlDrawer({
  presets,
  scenarioId,
  onSelectPreset,
  depot,
  stops,
  maxStops,
  pendingIds, 
  placingDepot,
  onTogglePlaceDepot,
  onRemoveStop,
  onClearAll,
}) {
  return (
    <aside className="drawer">
      <header className="drawer-header">
        <h1 className="drawer-title">Fire Fly Dispatch</h1>
        <p className="drawer-sub">Metro Manila (NCR) route optimizer</p>
      </header>

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