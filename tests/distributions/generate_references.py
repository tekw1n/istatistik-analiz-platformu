"""Regenerates references.json with mpmath (40 digits), independently of the TypeScript code.

Discrete tails are summed from the textbook PMF, not taken from incomplete gamma or beta functions.

Usage: python3 tests/distributions/generate_references.py
"""

import json
from pathlib import Path

from mpmath import mp, mpf, binomial, erfc, exp, factorial, fsum, gamma, gammainc, log, pi, sqrt

mp.dps = 40


def discrete(pmf, first, last, k):
    """pmf, P(X <= k), P(X > k); `last` truncates an infinite tail far below 1e-40 relative."""
    return (
        pmf(k),
        fsum(pmf(i) for i in range(first, k + 1)),
        fsum(pmf(i) for i in range(k + 1, last + 1)),
    )


def binomial_values(k, n, p):
    n = int(n)
    return discrete(lambda i: binomial(n, i) * p**i * (1 - p) ** (n - i), 0, n, k)


def poisson_values(k, lam):
    return discrete(lambda i: exp(-lam) * lam**i / factorial(i), 0, k + 400, k)


def geometric_values(k, p):
    return discrete(lambda i: p * (1 - p) ** (i - 1), 1, k + int(120 / float(p)), k)


def normal_values(x, mu, sd):
    z = (x - mu) / sd
    return (
        exp(-z * z / 2) / (sd * sqrt(2 * pi)),
        erfc(-z / sqrt(2)) / 2,
        erfc(z / sqrt(2)) / 2,
    )


def log_normal_values(x, mu, sd):
    density, cdf, sf = normal_values(log(x), mu, sd)
    return density / x, cdf, sf


def exponential_values(x, lam):
    return lam * exp(-lam * x), 1 - exp(-lam * x), exp(-lam * x)


def gamma_values(x, alpha, theta):
    y = x / theta
    return (
        x ** (alpha - 1) * exp(-y) / (gamma(alpha) * theta**alpha),
        gammainc(alpha, 0, y, regularized=True),
        gammainc(alpha, y, mp.inf, regularized=True),
    )


CASES = {
    "binomial": (binomial_values, True, [
        ([10, 0.3], [0, 1, 3, 7, 9]),
        ([50, 0.02], [0, 1, 2, 10, 40]),
        ([1000, 0.4], [300, 399, 400, 401, 500]),
        ([20, 0.97], [5, 18, 19]),
    ]),
    "poisson": (poisson_values, True, [
        ([0.5], [0, 1, 4, 20]),
        ([4], [0, 3, 4, 5, 15, 40]),
        ([100], [50, 99, 100, 150, 200]),
    ]),
    "geometric": (geometric_values, True, [
        ([0.25], [1, 2, 5, 60]),
        ([0.001], [1, 10, 5000]),
    ]),
    "normal": (normal_values, False, [
        ([0, 1], [-30, -3, 0, 1.96, 8, 30]),
        ([100, 15], [70, 100, 130, 220]),
    ]),
    "logNormal": (log_normal_values, False, [
        ([0, 1], [1e-6, 0.5, 1, 4, 1000]),
        ([2.5, 0.3], [5, 12, 40]),
    ]),
    "exponential": (exponential_values, False, [
        ([0.5], [0, 1e-12, 1, 4, 100]),
        ([3], [0.2, 2]),
    ]),
    "gamma": (gamma_values, False, [
        ([0.5, 2], [1e-8, 0.1, 1, 10, 80]),
        ([3, 1.5], [0.2, 2, 4.5, 20, 60]),
        ([100, 0.1], [5, 9.9, 10, 15]),
    ]),
}

rows = []
for name, (function, is_discrete, groups) in CASES.items():
    for parameters, points in groups:
        for point in points:
            # Arguments go through float first, so both sides evaluate the same double.
            x = point if is_discrete else mpf(float(point))
            values = function(x, *(mpf(float(v)) for v in parameters))
            rows.append([name, parameters, point, *(float(v) for v in values)])

lines = ",\n".join("  " + json.dumps(row) for row in rows)
Path(__file__).with_name("references.json").write_text("[\n" + lines + "\n]\n")
