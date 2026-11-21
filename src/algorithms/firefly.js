function decodeRoute(keys, distMatrix) {
  const indexed = keys.map((val, idx) => ({ val, stop: idx + 1 }));
  indexed.sort((a, b) => a.val - b.val);

  const route = [0, ...indexed.map((item) => item.stop), 0];
  let totalDist = 0;
  for (let i = 0; i < route.length - 1; i++) {
    totalDist += distMatrix[route[i]][route[i + 1]];
  }
  return { route, distance: totalDist };
}

export function runFireflyOptimization(distMatrix, options = {}) {
  const {
    populationSize = 30,
    iterations = 120,
    beta0 = 1.0,
    gamma = 0.5,
    alpha = 0.25,
    alphaDecay = 0.98,
    onProgress = null,
  } = options;

  const dim = distMatrix.length - 1; 
  if (dim <= 0) return { bestRoute: [0], bestDistance: 0, history: [] };

  // Initialize firefly population uniformly in [0, 1]^dim
  const fireflies = Array.from({ length: populationSize }, () =>
    Array.from({ length: dim }, () => Math.random())
  );

  let evaluated = fireflies.map((pos) => decodeRoute(pos, distMatrix));
  let bestIdx = 0;
  for (let i = 1; i < populationSize; i++) {
    if (evaluated[i].distance < evaluated[bestIdx].distance) bestIdx = i;
  }

  let bestPos = [...fireflies[bestIdx]];
  let bestRoute = [...evaluated[bestIdx].route];
  let bestDistance = evaluated[bestIdx].distance;
  const history = [bestDistance];

  for (let t = 0; t < iterations; t++) {
    const alphaT = alpha * Math.pow(alphaDecay, t);

    for (let i = 0; i < populationSize; i++) {
      for (let j = 0; j < populationSize; j++) {
        if (evaluated[j].distance < evaluated[i].distance) {
          let r2 = 0;
          for (let d = 0; d < dim; d++) {
            const diff = fireflies[i][d] - fireflies[j][d];
            r2 += diff * diff;
          }
          const beta = beta0 * Math.exp(-gamma * r2);

          for (let d = 0; d < dim; d++) {
            const step = alphaT * (Math.random() - 0.5);
            const updated =
              fireflies[i][d] +
              beta * (fireflies[j][d] - fireflies[i][d]) +
              step;
            fireflies[i][d] = Math.min(1, Math.max(0, updated));
          }

          evaluated[i] = decodeRoute(fireflies[i], distMatrix);

          if (evaluated[i].distance < bestDistance) {
            bestDistance = evaluated[i].distance;
            bestRoute = [...evaluated[i].route];
            bestPos = [...fireflies[i]];
          }
        }
      }
    }

    // Guide the weakest firefly slightly toward the global best
    let worstIdx = 0;
    for (let i = 1; i < populationSize; i++) {
      if (evaluated[i].distance > evaluated[worstIdx].distance) worstIdx = i;
    }
    for (let d = 0; d < dim; d++) {
      const nudged =
        0.5 * (fireflies[worstIdx][d] + bestPos[d]) +
        alphaT * (Math.random() - 0.5);
      fireflies[worstIdx][d] = Math.min(1, Math.max(0, nudged));
    }
    evaluated[worstIdx] = decodeRoute(fireflies[worstIdx], distMatrix);
    if (evaluated[worstIdx].distance < bestDistance) {
      bestDistance = evaluated[worstIdx].distance;
      bestRoute = [...evaluated[worstIdx].route];
      bestPos = [...fireflies[worstIdx]];
    }

    history.push(bestDistance);
    if (onProgress && t % 5 === 0) {
      onProgress({ iteration: t + 1, bestDistance, bestRoute });
    }
  }

  return { bestRoute, bestDistance, history };
}