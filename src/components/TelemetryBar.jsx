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

  const { bestDistance, savedPct, elapsedMs, history } = result;
  const sparkData = {
    labels: history.map((_, i) => i),
    datasets: [
      {
        data: history,
        borderColor: "#2563EB",
        backgroundColor: "rgba(37,99,235,0.08)",
        borderWidth: 1.5,
        tension: 0.2,
        fill: true,
      },
    ],
  };

  return (
    <div className="ff-telemetry">
      <div className="ff-kpi">
        <div className="k">Distance</div>
        <div className="v">{bestDistance.toFixed(2)} km</div>
      </div>
      <div className="ff-kpi">
        <div className="k">vs Nearest Neighbor</div>
        <div className="v">
          {savedPct >= 0 ? "−" : "+"}
          {Math.abs(savedPct).toFixed(1)}%
        </div>
      </div>
      <div className="ff-kpi">
        <div className="k">Runtime</div>
        <div className="v">{Math.round(elapsedMs)} ms</div>
      </div>
      <div className="ff-spark">
        <Line data={sparkData} options={sparkOptions} />
      </div>
    </div>
  );
}