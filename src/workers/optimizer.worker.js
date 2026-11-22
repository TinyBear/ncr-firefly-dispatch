import { runFireflyOptimization } from "../algorithms/firefly.js";
import { runNearestNeighbor } from "../algorithms/baseline.js";

self.onmessage = (event) => {
  try {
    const { distMatrix, options } = event.data;

    const baseline = runNearestNeighbor(distMatrix);
    const startTime = performance.now();

    const result = runFireflyOptimization(distMatrix, {
      ...options,
      onProgress: (progress) => {
        self.postMessage({ type: "PROGRESS", payload: progress });
      },
    });

    const elapsedMs = performance.now() - startTime;

    self.postMessage({
      type: "COMPLETE",
      payload: { ...result, baseline, elapsedMs },
    });
  } catch (err) {
    self.postMessage({ type: "ERROR", payload: String(err?.message ?? err) });
  }
};