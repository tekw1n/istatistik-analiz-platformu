import { describe, expect, it } from 'vitest';
import { maximize } from '../../src/math/optimization';

describe('maximize', () => {
  it('finds a maximum in one and two dimensions', () => {
    const [x] = maximize(([a]) => -((a! - 3) ** 2), [0]);
    expect(x).toBeCloseTo(3, 7);

    // Rosenbrock valley with its maximum at (1, 1).
    const [u, v] = maximize(
      ([a, b]) => -(100 * (b! - a! * a!) ** 2 + (1 - a!) ** 2),
      [-1.2, 1],
    );
    expect(u).toBeCloseTo(1, 6);
    expect(v).toBeCloseTo(1, 6);
  });

  it('treats points outside the domain as worse', () => {
    const [x] = maximize(([a]) => (a! > -1 ? Math.log(a! + 1) - a! / 3 : NaN), [0]);
    expect(x).toBeCloseTo(2, 7);
  });

  it('throws when there is no finite maximum', () => {
    expect(() => maximize(([a]) => a!, [0])).toThrow('did not converge');
  });

  it('throws when the starting point is not finite', () => {
    expect(() => maximize(() => -Infinity, [0])).toThrow(RangeError);
  });
});
