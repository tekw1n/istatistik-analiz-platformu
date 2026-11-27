"""End-to-end reference results computed with mpmath (40 digits), independently of the
TypeScript code. The merged class groups are written out by hand from the merge rule.

Usage: python3 tests/chiSquare/generate_references.py
"""

import json
from pathlib import Path

from mpmath import mp, mpf, binomial, erfc, exp, factorial, fsum, gammainc, sqrt

mp.dps = 40


def upper(df, x):
    return gammainc(mpf(df) / 2, x / 2, mp.inf, regularized=True)


def critical(df, alpha):
    lo, hi = mpf(0), mpf(200)
    for _ in range(140):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if upper(df, mid) > alpha else (lo, mid)
    return lo


def solve(observed, probabilities, groups, estimated):
    assert abs(fsum(probabilities) - 1) < mpf("1e-30")
    n = sum(observed)
    expected = [n * p for p in probabilities]
    merged = [(sum(observed[i] for i in g), fsum(expected[i] for i in g)) for g in groups]
    assert all(e >= 5 for _, e in merged)
    statistic = fsum((o - e) ** 2 / e for o, e in merged)
    df = len(merged) - 1 - estimated
    return {
        "expected": [float(e) for e in expected],
        "mergedObserved": [o for o, _ in merged],
        "mergedExpected": [float(e) for _, e in merged],
        "statistic": float(statistic),
        "df": df,
        "pValue": float(upper(df, statistic)),
        "criticalValue": float(critical(df, mpf("0.05"))),
    }


# Bortkiewicz: deaths by horse kicks, 200 corps-years; lambda = sample mean = 0.61.
horse = [109, 65, 22, 3, 1]
lam = mpf(sum(k * f for k, f in enumerate(horse))) / sum(horse)
poisson = [exp(-lam) * lam**k / factorial(k) for k in range(4)]
poisson.append(1 - fsum(poisson))

# Five fair coins tossed 320 times (number of heads).
coins = [18, 56, 110, 88, 40, 8]
fair = [binomial(5, k) / mpf(32) for k in range(6)]
p_hat = mpf(sum(k * f for k, f in enumerate(coins))) / (5 * sum(coins))
estimated = [binomial(5, k) * p_hat**k * (1 - p_hat) ** (5 - k) for k in range(6)]

# Heights in cm with open end classes; mu and sigma given externally.
heights = [4, 15, 32, 30, 14, 5]
edges = [150, 160, 170, 180, 190]
cdf = [mpf(0)] + [erfc(-(mpf(x) - 170) / (12 * sqrt(2))) / 2 for x in edges] + [mpf(1)]
normal = [b - a for a, b in zip(cdf, cdf[1:])]

references = {
    "poisson": solve(horse, poisson, [[0], [1], [2, 3, 4]], 1),
    "binomialKnown": solve(coins, fair, [[0], [1], [2], [3], [4], [5]], 0),
    "binomialEstimated": solve(coins, estimated, [[0], [1], [2], [3], [4], [5]], 1),
    # Both end classes have E = 4.78 and are merged inwards.
    "normal": solve(heights, normal, [[0, 1], [2], [3], [4, 5]], 0),
}
Path(__file__).with_name("references.json").write_text(json.dumps(references, indent=2) + "\n")
