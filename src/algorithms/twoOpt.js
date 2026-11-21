export function twoOpt(route, distMatrix, maxPasses = 50) {
  const cost = (r) => {
    let d = 0;
    for (let i = 0; i < r.length - 1; i++) d += distMatrix[r[i]][r[i + 1]];
    return d;
  };

  let best = [...route];
  let bestDist = cost(best);
  let improved = true;
  let passes = 0;

  while (improved && passes < maxPasses) {
    improved = false;
    passes++;

    for (let i = 1; i < best.length - 2; i++) {
      for (let k = i + 1; k < best.length - 1; k++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, k + 1).reverse(),
          ...best.slice(k + 1),
        ];
        const d = cost(candidate);
        if (d < bestDist - 1e-9) {
          best = candidate;
          bestDist = d;
          improved = true;
        }
      }
    }
  }
  return { route: best, distance: bestDist };
}