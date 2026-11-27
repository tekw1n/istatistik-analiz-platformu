"""Maximum likelihood reference values computed with mpmath (40 digits), independently of
the TypeScript code: the gradient of the log-likelihood is driven to zero with Newton's method.

Usage: python3 tests/estimation/generate_references.py
"""

import json
from pathlib import Path

from mpmath import mp, mpf, diff, digamma, erfc, exp, factorial, findroot, fsum, gammainc, log, sqrt

mp.dps = 40
INF = float("inf")


def normal_cdf(x, mu, sigma):
    if x == INF:
        return mpf(1)
    if x == -INF:
        return mpf(0)
    return erfc(-(x - mu) / (sigma * sqrt(2))) / 2


CDF = {
    "normal": normal_cdf,
    "logNormal": lambda x, mu, s: mpf(0) if x <= 0 else normal_cdf(INF if x == INF else log(x), mu, s),
    "exponential": lambda x, lam: mpf(0) if x <= 0 else (mpf(1) if x == INF else 1 - exp(-lam * x)),
    "gamma": lambda x, a, t: mpf(0) if x <= 0 else (
        mpf(1) if x == INF else gammainc(a, 0, x / t, regularized=True)),
}


def grouped(name, bounds, frequencies, start):
    cdf = CDF[name]

    def loglik(*theta):
        return fsum(f * log(cdf(hi, *theta) - cdf(lo, *theta))
                    for lo, hi, f in zip(bounds, bounds[1:], frequencies) if f)

    if len(start) == 1:
        return [findroot(lambda a: diff(loglik, a), mpf(start[0]))]
    gradient = [lambda a, b: diff(loglik, (a, b), (1, 0)), lambda a, b: diff(loglik, (a, b), (0, 1))]
    return list(findroot(gradient, [mpf(v) for v in start]))


def censored_poisson(frequencies, tail_from, tail_frequency, start):
    """Counts 0, 1, ... with the given frequencies, plus an open class X >= tail_from."""
    def loglik(lam):
        pmf = lambda k: exp(-lam) * lam**k / factorial(k)
        return (fsum(f * log(pmf(k)) for k, f in enumerate(frequencies))
                + tail_frequency * log(1 - fsum(pmf(k) for k in range(tail_from))))

    return findroot(lambda a: diff(loglik, a), mpf(start))


GROUPED = [
    ("normal", [-INF, 150, 160, 170, 180, 190, INF], [4, 15, 32, 30, 14, 5], [170, 12]),
    ("normal", [0, 2, 4, 6, 8, 10], [3, 12, 20, 11, 4], [5, 2]),
    ("exponential", [0, 1, 3, 4, 8, INF], [40, 35, 8, 13, 4], [0.4]),
    ("gamma", [0, 2, 4, 6, 9, 14, INF], [12, 30, 27, 19, 9, 3], [3, 1.7]),
    ("logNormal", [0, 1, 2, 4, 8, INF], [8, 22, 35, 24, 11], [1, 0.9]),
]

raw = [0.8, 1.1, 1.9, 2.3, 2.4, 3.0, 3.7, 4.4, 5.2, 7.9, 9.5]
mean = fsum(mpf(v) for v in raw) / len(raw)
s = log(mean) - fsum(log(mpf(v)) for v in raw) / len(raw)
alpha = findroot(lambda a: log(a) - digamma(a) - s, mpf(2))

references = {
    "grouped": [
        # Infinite bounds are written as null.
        [name, [None if abs(b) == INF else b for b in bounds], f,
         [float(v) for v in grouped(name, bounds, f, start)]]
        for name, bounds, f, start in GROUPED
    ],
    "gammaRaw": {"values": raw, "alpha": float(alpha), "theta": float(mean / alpha)},
    "censoredPoisson": {
        "frequencies": [12, 27, 31, 16, 9], "tailFrom": 5, "tailFrequency": 5,
        "lambda": float(censored_poisson([12, 27, 31, 16, 9], 5, 5, 2)),
    },
}

Path(__file__).with_name("references.json").write_text(json.dumps(references, indent=2) + "\n")
