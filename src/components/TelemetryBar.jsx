import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
} from "chart.js";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler);

const sparkOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: { x: { display: false }, y: { display: false } },
  elements: { point: { radius: 0 } },
};

export default function TelemetryBar({ result }) {
  if (!result) return null;

  const { bestDistance, savedPct, baselineDistance, elapsedMs, history, bestRoute, source, usedFallback } = result;
  const isRoad = source.startsWith("OSRM");

  const sparkData = {
    labels: history.map((_, i) => i),
    datasets: [
      {
        data: history,
        borderColor: "#00B14F",
        backgroundColor: "rgba(0,177,79,0.12)",
        borderWidth: 2,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  return (
    <section className="fd-tele" aria-live="polite">
      <div className="fd-tele-top">
        <div>
          <p className="fd-eyebrow">{isRoad ? "Road distance" : "Straight-line estimate"}</p>
          <div className="fd-big">
            <span>{bestDistance.toFixed(2)}</span>
            <span className="u">km</span>
          </div>
        </div>
        {savedPct > 0.05 ? (
          <span className="fd-badge">↓ {savedPct.toFixed(1)}% vs nearest neighbor</span>
        ) : (
          <span className="fd-badge neutral">
            {savedPct < -0.05
              ? `Nearest neighbor ${Math.abs(savedPct).toFixed(1)}% shorter`
              : "Matches nearest neighbor"}
          </span>
        )}
      </div>

      <div className="fd-kpis">
        <div className="fd-kpi"><span>Stops</span><b>{bestRoute.length - 2}</b></div>
        <div className="fd-kpi"><span>Compute</span><b>{Math.round(elapsedMs)} ms</b></div>
        <div className="fd-kpi"><span>Baseline</span><b>{baselineDistance.toFixed(1)} km</b></div>
      </div>

      <div className="fd-spark">
        <Line data={sparkData} options={sparkOptions} />
      </div>

      {usedFallback && (
        <div className="fd-note">Road routing was unavailable. Showing straight-line distances.</div>
      )}
    </section>
  );
}