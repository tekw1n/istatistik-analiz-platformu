/**
 * Brent's method on a bracketing interval [lower, upper].
 * f(lower) and f(upper) must have opposite signs (or one of them must be zero).
 * `tolerance` is an absolute tolerance on the root; 0 asks for machine precision.
 */
export function findRoot(
  f: (x: number) => number,
  lower: number,
  upper: number,
  tolerance = 0,
  maxIterations = 2000,
): number {
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
    throw new RangeError('findRoot: bounds must be finite');
  }

  let a = lower;
  let b = upper;
  let fa = f(a);
  let fb = f(b);
  if (fa === 0) return a;
  if (fb === 0) return b;
  if (Number.isNaN(fa) || Number.isNaN(fb) || fa > 0 === fb > 0) {
    throw new RangeError('findRoot: interval does not bracket a root');
  }

  // b is the best estimate, [b, c] always brackets the root, a is the previous b.
  let c = a;
  let fc = fa;
  let step = b - a;
  let previousStep = step;

  for (let i = 0; i < maxIterations; i++) {
    if (fb > 0 === fc > 0) {
      c = a;
      fc = fa;
      step = previousStep = b - a;
    }
    if (Math.abs(fc) < Math.abs(fb)) {
      a = b;
      b = c;
      c = a;
      fa = fb;
      fb = fc;
      fc = fa;
    }

    const tol = 2 * Number.EPSILON * Math.abs(b) + tolerance / 2 + Number.MIN_VALUE;
    const half = (c - b) / 2;
    if (Math.abs(half) <= tol || fb === 0) return b;

    if (Math.abs(previousStep) >= tol && Math.abs(fa) > Math.abs(fb)) {
      // Secant (two points) or inverse quadratic interpolation (three points).
      const s = fb / fa;
      let p: number;
      let q: number;
      if (a === c) {
        p = 2 * half * s;
        q = 1 - s;
      } else {
        const t = fa / fc;
        const r = fb / fc;
        p = s * (2 * half * t * (t - r) - (b - a) * (r - 1));
        q = (t - 1) * (r - 1) * (s - 1);
      }
      if (p > 0) q = -q;
      p = Math.abs(p);

      if (2 * p < Math.min(3 * half * q - Math.abs(tol * q), Math.abs(previousStep * q))) {
        previousStep = step;
        step = p / q;
      } else {
        step = previousStep = half;
      }
    } else {
      step = previousStep = half;
    }

    a = b;
    fa = fb;
    b += Math.abs(step) > tol ? step : half > 0 ? tol : -tol;
    fb = f(b);
    if (Number.isNaN(fb)) throw new RangeError(`findRoot: f(${b}) is NaN`);
  }

  throw new Error('findRoot: did not converge');
}
