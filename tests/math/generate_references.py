"""Regenerates references.json with mpmath (40 digits), independently of the TypeScript code.

Usage: python3 tests/math/generate_references.py
"""

import json
from pathlib import Path

from mpmath import mp, mpf, digamma, erf, erfc, gamma, gammainc, loggamma, sqrt

mp.dps = 40


def table(function, argument_lists):
    # Arguments go through float first, so both sides evaluate the same double.
    return [
        [*args, float(function(*(mpf(float(a)) for a in args)))] for args in argument_lists
    ]


def upper(a, x):
    return gammainc(a, x, mp.inf, regularized=True)


def lower(a, x):
    return gammainc(a, 0, x, regularized=True)


def critical_value(df, alpha):
    """x with P(chi2_df > x) = alpha, by bisection."""
    lo, hi = mpf(0), mpf(1)
    while upper(df / 2, hi / 2) > alpha:
        hi *= 2
    for _ in range(120):
        mid = (lo + hi) / 2
        if upper(df / 2, mid / 2) > alpha:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


singles = lambda *xs: [[x] for x in xs]

incomplete_gamma_arguments = [
    [0.01, 1], [0.1, 0.001], [0.5, 0.25], [0.5, 2], [1, 1], [1, 30], [2.5, 0.1], [2.5, 3.4],
    [2.5, 3.6], [5, 2], [5, 20], [10, 10], [10, 100], [50, 40], [50, 70], [100, 100],
    [1000, 900], [1000, 1100], [10000, 10100],
]
tail_arguments = singles(-6, -2.5, -1, -0.3, -1e-10, 0, 1e-200, 1e-10, 1e-8, 0.2, 0.5, 1,
                         1.2, 1.3, 2, 3.5, 5, 10, 20, 26)
normal_arguments = singles(-37, -10, -5, -1.959963984540054, -1, -1e-12, 0, 0.5, 1,
                           1.6448536269501472, 3, 6, 10, 37)

references = {
    "logGamma": table(loggamma, singles(1e-10, 0.001, 0.1, 0.25, 0.5, 0.9999, 1, 1.5, 2, 2.0001,
                                        3, 4.5, 10, 33.3, 100, 1000.5, 1e6, 1e10)),
    "gamma": table(gamma, singles(-4.5, -2.5, -1.5, -0.5, 1e-8, 0.1, 0.5, 1, 1.5, 2, 3.7, 5, 6,
                                  10.5, 23, 30, 50.25, 100, 141.5, 170.5, 171)),
    "digamma": table(digamma, singles(1e-6, 0.01, 0.1, 0.5, 1, 1.4616321449683623, 2, 3.5, 9.9,
                                      10, 42, 1000, 1e8)),
    "regularizedGammaP": table(lower, incomplete_gamma_arguments),
    "regularizedGammaQ": table(upper, incomplete_gamma_arguments),
    "erf": table(erf, tail_arguments),
    "erfc": table(erfc, tail_arguments),
    "normalCdf": table(lambda z: erfc(-z / sqrt(2)) / 2, normal_arguments),
    "normalSf": table(lambda z: erfc(z / sqrt(2)) / 2, normal_arguments),
    "chiSquareCritical": table(
        critical_value,
        [[df, alpha] for df in range(1, 21) for alpha in (0.10, 0.05, 0.01)]
        + [[1, 0.999], [1, 1e-12], [4, 0.5], [7, 0.025], [100, 0.05], [1000, 0.001]],
    ),
}

lines = [f'  "{name}": {json.dumps(rows)}' for name, rows in references.items()]
Path(__file__).with_name("references.json").write_text("{\n" + ",\n".join(lines) + "\n}\n")
