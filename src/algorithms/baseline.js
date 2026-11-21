export function runNearestNeighbor(distMatrix) {
  const n = distMatrix.length;
  if (n <= 1) return { route: [0], distance: 0 };

  const visited = new Array(n).fill(false);
  const route = [0];
  visited[0] = true;
  let current = 0;
  let totalDist = 0;

  for (let step = 1; step < n; step++) {
    let nearest = -1;
    let minDist = Infinity;
    for (let next = 1; next < n; next++) {
      if (!visited[next] && distMatrix[current][next] < minDist) {
        minDist = distMatrix[current][next];
        nearest = next;
      }
    }
    visited[nearest] = true;
    route.push(nearest);
    totalDist += minDist;
    current = nearest;
  }

  totalDist += distMatrix[current][0];
  route.push(0);
  return { route, distance: totalDist };
}