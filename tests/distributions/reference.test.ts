import { describe, expect, it } from 'vitest';
import { exponential } from '../../src/distributions/continuous/exponential';
import { gammaDistribution } from '../../src/distributions/continuous/gammaDistribution';
import { logNormal } from '../../src/distributions/continuous/logNormal';
import { normal } from '../../src/distributions/continuous/normal';
import { binomial } from '../../src/distributions/discrete/binomial';
import { geometric } from '../../src/distributions/discrete/geometric';
import { poisson } from '../../src/distributions/discrete/poisson';
import type { Distribution } from '../../src/distributions/distributionTypes';
import references from './references.json';

const factories: Record<string, (a: number, b: number) => Distribution> = {
  binomial,
  poisson,
  geometric: (p) => geometric(p),
  normal,
  logNormal,
  exponential,
  gamma: gammaDistribution,
};

function expectClose(actual: number, expected: number): void {
  const error = Math.abs(actual - expected) / (expected === 0 ? 1 : Math.abs(expected));
  expect(error, `got ${actual}, expected ${expected}`).toBeLessThanOrEqual(1e-10);
}

describe('PMF/PDF, CDF and SF against mpmath', () => {
  const rows = references as [string, number[], number, number, number, number][];

  it.each(rows)('%s(%j) at %s', (name, parameters, x, density, cdf, sf) => {
    const d = factories[name]!(parameters[0]!, parameters[1]!);
    expectClose(d.kind === 'discrete' ? d.pmf(x) : d.pdf(x), density);
    expectClose(d.cdf(x), cdf);
    expectClose(d.sf(x), sf);
  });
});
