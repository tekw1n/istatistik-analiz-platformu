import { findRoot } from './rootFinding';

// Lanczos approximation, g = 7, 9 coefficients.
const LANCZOS_G = 7;
const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
];

function lanczosSum(z: number): number {
  let sum = LANCZOS[0]!;
  for (let i = 1; i < LANCZOS.length; i++) sum += LANCZOS[i]! / (z + i);
  return sum;
}

function requirePositive(value: number, name: string): void {
  if (!(value > 0)) throw new RangeError(`${name} must be positive, got ${value}`);
}

/** ln Γ(x) for x > 0. */
export function logGamma(x: number): number {
  requirePositive(x, 'logGamma: x');
  if (x === Infinity) return Infinity;
  if (x === 1 || x === 2) return 0;
  // Reflection keeps the Lanczos series in its accurate range.
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);

  const z = x - 1;
  const t = z + LANCZOS_G + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(lanczosSum(z));
}

/** Γ(x) for real x except the poles 0, -1, -2, ... Overflows to Infinity above x ≈ 171.62. */
export function gamma(x: number): number {
  if (Number.isNaN(x) || (x <= 0 && Number.isInteger(x))) {
    throw new RangeError(`gamma: undefined for x = ${x}`);
  }
  if (x > 171.7) return Infinity;
  if (Number.isInteger(x)) {
    let product = 1;
    for (let k = 2; k < x; k++) product *= k;
    return product;
  }
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));

  const z = x - 1;
  const t = z + LANCZOS_G + 0.5;
  // The power is split in two so it does not overflow before exp(-t) scales it down.
  const halfPower = t ** ((z + 0.5) / 2);
  return Math.sqrt(2 * Math.PI) * halfPower * Math.exp(-t) * halfPower * lanczosSum(z);
}

/** ψ(x) = d/dx ln Γ(x) for x > 0. */
export function digamma(x: number): number {
  requirePositive(x, 'digamma: x');
  // Recurrence ψ(x) = ψ(x + 1) - 1/x, then the asymptotic series.
  let result = 0;
  let y = x;
  while (y < 10) {
    result -= 1 / y;
    y += 1;
  }
  const f = 1 / (y * y);
  const series =
    f *
    (1 / 12 -
      f *
        (1 / 120 -
          f * (1 / 252 - f * (1 / 240 - f * (1 / 132 - f * (691 / 32760 - f / 12))))));
  return result + Math.log(y) - 0.5 / y - series;
}

// shortcut: both expansions need about sqrt(a) terms and lose digits as a·ln(a)·ε;
// switch to an asymptotic expansion if shapes above ~1e6 are ever needed.
const MAX_TERMS = 100_000;

/** x^a e^(-x) / Γ(a) */
function gammaPrefactor(a: number, x: number): number {
  return Math.exp(a * Math.log(x) - x - logGamma(a));
}

/** P(a, x) by its power series; converges quickly for x < a + 1. */
function lowerSeries(a: number, x: number): number {
  let term = 1 / a;
  let sum = term;
  for (let n = 1; n <= MAX_TERMS; n++) {
    term *= x / (a + n);
    sum += term;
    if (term < sum * Number.EPSILON) return sum * gammaPrefactor(a, x);
  }
  throw new Error(`incomplete gamma series did not converge (a = ${a}, x = ${x})`);
}

/** Q(a, x) by its continued fraction (modified Lentz); converges quickly for x >= a + 1. */
function upperContinuedFraction(a: number, x: number): number {
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= MAX_TERMS; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) <= Number.EPSILON) return h * gammaPrefactor(a, x);
  }
  throw new Error(`incomplete gamma continued fraction did not converge (a = ${a}, x = ${x})`);
}

function requireIncompleteGammaDomain(a: number, x: number): void {
  if (!(a > 0) || !Number.isFinite(a) || !(x >= 0)) {
    throw new RangeError(`incomplete gamma needs finite a > 0 and x >= 0, got a = ${a}, x = ${x}`);
  }
}

/** Regularized lower incomplete gamma P(a, x) = γ(a, x) / Γ(a). */
export function regularizedGammaP(a: number, x: number): number {
  requireIncompleteGammaDomain(a, x);
  if (x === 0) return 0;
  if (x === Infinity) return 1;
  return x < a + 1 ? lowerSeries(a, x) : 1 - upperContinuedFraction(a, x);
}

/** Regularized upper incomplete gamma Q(a, x) = 1 - P(a, x), computed directly in the upper tail. */
export function regularizedGammaQ(a: number, x: number): number {
  requireIncompleteGammaDomain(a, x);
  if (x === 0) return 1;
  if (x === Infinity) return 0;
  return x < a + 1 ? 1 - lowerSeries(a, x) : upperContinuedFraction(a, x);
}

/** The x that solves Q(a, x) = q, for 0 <= q <= 1. */
export function inverseRegularizedGammaQ(a: number, q: number): number {
  requireIncompleteGammaDomain(a, 0);
  if (!(q >= 0 && q <= 1)) throw new RangeError(`probability must be in [0, 1], got ${q}`);
  if (q === 1) return 0;
  if (q === 0) return Infinity;

  // Solve against the smaller tail to avoid cancellation.
  const f =
    q <= 0.5
      ? (x: number) => regularizedGammaQ(a, x) - q
      : (x: number) => 1 - q - regularizedGammaP(a, x);

  let upper = a + 1;
  while (f(upper) > 0) upper *= 2;
  return findRoot(f, 0, upper);
}
