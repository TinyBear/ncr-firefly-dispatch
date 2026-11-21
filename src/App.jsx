export default function App() {
  return (
    <>
      <aside className="drawer panel">
        <div className="label">Scenario</div>
        <h2 style={{ margin: "4px 0 12px", fontSize: 16 }}>Fire Fly Dispatch</h2>

        <p style={{ color: "var(--text-muted)" }}>
          Inter is used for UI text like this paragraph.
        </p>

        <div className="mono" style={{ margin: "12px 0" }}>
          14.82 km · 42 ms · 0123456789
        </div>

        <button className="btn btn-primary">Run Optimization</button>{" "}
        <button className="btn">Secondary</button>{" "}
        <button className="btn" disabled>Disabled</button>
      </aside>

      <div className="telemetry panel mono">Saved 12.4%</div>
    </>
  );
}