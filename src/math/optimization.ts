// A search that wanders this far from its starting point has no finite maximum.
const RUNAWAY = 40;
const MAX_ITERATIONS = 5000;
const MAX_RESTARTS = 30;

interface Vertex {
  x: number[];
  cost: number;
}

/** One Nelder–Mead descent until the simplex has collapsed. */
function descend(cost: (x: number[]) => number, start: Vertex, step: number): Vertex {
  const dimension = start.x.length;
  const vertex = (x: number[]): Vertex => ({ x, cost: cost(x) });
  const simplex = [
    start,
    ...start.x.map((_, i) => vertex(start.x.map((v, j) => (i === j ? v + step : v)))),
  ];

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    simplex.sort((a, b) => a.cost - b.cost);
    const best = simplex[0]!;
    const worst = simplex[dimension]!;
    const size = Math.max(
      ...simplex.map((v) => Math.max(...v.x.map((c, j) => Math.abs(c - best.x[j]!)))),
    );
    if (size <= 1e-10) return best;
    if (best.x.some((c) => Math.abs(c) > RUNAWAY)) break;

    const centroid = best.x.map(
      (_, j) => simplex.slice(0, dimension).reduce((sum, v) => sum + v.x[j]!, 0) / dimension,
    );
    // Point on the line through the worst vertex and the centroid of the others.
    const along = (t: number) => vertex(centroid.map((c, j) => c + t * (c - worst.x[j]!)));

    const reflected = along(1);
    if (reflected.cost < best.cost) {
      const expanded = along(2);
      simplex[dimension] = expanded.cost < reflected.cost ? expanded : reflected;
    } else if (reflected.cost < simplex[dimension - 1]!.cost) {
      simplex[dimension] = reflected;
    } else {
      const contracted = along(reflected.cost < worst.cost ? 0.5 : -0.5);
      if (contracted.cost < Math.min(reflected.cost, worst.cost)) {
        simplex[dimension] = contracted;
      } else {
        for (let i = 1; i <= dimension; i++) {
          simplex[i] = vertex(simplex[i]!.x.map((c, j) => (c + best.x[j]!) / 2));
        }
      }
    }
  }
  throw new Error('maximize: did not converge');
}

/**
 * Derivative-free maximization (Nelder–Mead with restarts) in a few dimensions.
 * Coordinates are expected to be scaled so that 0.5 is a sensible first step and the
 * maximum lies within ±40 of the origin. Throws instead of returning an unconverged point.
 */
export function maximize(f: (x: number[]) => number, start: number[]): number[] {
  const cost = (x: number[]) => {
    const value = -f(x);
    return Number.isNaN(value) ? Infinity : value;
  };
  let current: Vertex = { x: start, cost: cost(start) };
  if (!Number.isFinite(current.cost)) {
    throw new RangeError('maximize: the function is not finite at the starting point');
  }

  // A collapsed simplex can stall short of the maximum, so restart until nothing improves.
  let step = 0.5;
  for (let restart = 0; restart < MAX_RESTARTS; restart++) {
    const next = descend(cost, current, step);
    const gain = current.cost - next.cost;
    current = next;
    if (restart > 0 && gain <= 1e-13 * (1 + Math.abs(next.cost))) return next.x;
    step = 0.05;
  }
  throw new Error('maximize: did not converge');
}
