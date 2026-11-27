// shortcut: a feature narrower than 1/32 of the interval can be missed by every sample;
// split the interval at the peak before integrating such functions.
const PANELS = 16;
const MAX_DEPTH = 50;
const MAX_EVALUATIONS = 1_000_000;

/**
 * Adaptive Simpson quadrature of f over the finite interval [a, b].
 * Throws instead of returning an unconverged value.
 */
export function integrate(
  f: (x: number) => number,
  a: number,
  b: number,
  tolerance = 1e-10,
): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || !(tolerance > 0)) {
    throw new RangeError('integrate: needs finite bounds and a positive tolerance');
  }

  let evaluations = 0;
  const evaluate = (x: number): number => {
    if (++evaluations > MAX_EVALUATIONS) throw new Error('integrate: did not converge');
    const y = f(x);
    if (!Number.isFinite(y)) throw new RangeError(`integrate: f(${x}) is not finite`);
    return y;
  };

  const simpson = (width: number, fa: number, fm: number, fb: number) =>
    (width / 6) * (fa + 4 * fm + fb);

  const refine = (
    lo: number,
    hi: number,
    flo: number,
    fmid: number,
    fhi: number,
    whole: number,
    tol: number,
    depth: number,
  ): number => {
    const mid = (lo + hi) / 2;
    const fl = evaluate((lo + mid) / 2);
    const fr = evaluate((mid + hi) / 2);
    const left = simpson(mid - lo, flo, fl, fmid);
    const right = simpson(hi - mid, fmid, fr, fhi);
    const error = left + right - whole;
    // The second test stops refinement once the difference is only rounding noise.
    if (
      Math.abs(error) <= 15 * tol ||
      Math.abs(error) <= 4 * Number.EPSILON * Math.abs(left + right)
    ) {
      return left + right + error / 15;
    }
    if (depth >= MAX_DEPTH) throw new Error('integrate: did not converge');
    return (
      refine(lo, mid, flo, fl, fmid, left, tol / 2, depth + 1) +
      refine(mid, hi, fmid, fr, fhi, right, tol / 2, depth + 1)
    );
  };

  let total = 0;
  const width = (b - a) / PANELS;
  let lo = a;
  let flo = evaluate(a);
  for (let i = 1; i <= PANELS; i++) {
    const hi = i === PANELS ? b : a + i * width;
    const fmid = evaluate((lo + hi) / 2);
    const fhi = evaluate(hi);
    const whole = simpson(hi - lo, flo, fmid, fhi);
    total += refine(lo, hi, flo, fmid, fhi, whole, tolerance / PANELS, 0);
    lo = hi;
    flo = fhi;
  }
  return total;
}
