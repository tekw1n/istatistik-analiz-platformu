"""Reference results of the sample problems, computed with mpmath (40 digits) independently of
the TypeScript code. The merged class groups are written out by hand and checked here.

Usage: python3 tests/data-entry/generate_sample_references.py
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


def solve(parameters, observed, probabilities, groups, estimated, alpha=mpf("0.05")):
    assert abs(fsum(probabilities) - 1) < mpf("1e-30")
    n = sum(observed)
    expected = [n * p for p in probabilities]
    assert sorted(i for g in groups for i in g) == list(range(len(observed)))
    merged = [(sum(observed[i] for i in g), fsum(expected[i] for i in g)) for g in groups]
    assert all(e >= 5 for _, e in merged), [float(e) for e in expected]
    statistic = fsum((o - e) ** 2 / e for o, e in merged)
    df = len(merged) - 1 - estimated
    p_value = upper(df, statistic)
    return {
        "params": [float(v) for v in parameters],
        "total": n,
        "initialClassCount": len(observed),
        "finalClassCount": len(merged),
        "df": df,
        "statistic": float(statistic),
        "criticalValue": float(critical(df, alpha)),
        "pValue": float(p_value),
        "rejectNull": bool(p_value < alpha),
    }


references = {}

# Calls per minute: the last class is X >= 6, so lambda maximises the censored likelihood.
calls = [24, 28, 28, 22, 10, 5, 3]


def calls_pmf(lam):
    pmf = [exp(-lam) * lam**k / factorial(k) for k in range(6)]
    return pmf + [1 - fsum(pmf)]


def calls_log_likelihood(lam):
    return fsum(f * mp.log(p) for f, p in zip(calls, calls_pmf(lam)))


lam = mp.findroot(lambda a: mp.diff(calls_log_likelihood, a), mpf(2))
references["poissonCalls"] = solve([lam], calls, calls_pmf(lam),
                                   [[0], [1], [2], [3], [4], [5, 6]], 1)

# Defective bulbs in boxes of five.
bulbs = [112, 68, 17, 2, 1, 0]
p = mpf(sum(k * f for k, f in enumerate(bulbs))) / (5 * sum(bulbs))
references["binomialBulbs"] = solve(
    [5, p], bulbs, [binomial(5, k) * p**k * (1 - p) ** (5 - k) for k in range(6)],
    [[0], [1], [2, 3, 4, 5]], 1)

# A die thrown 120 times; a and b are known.
die = [25, 17, 15, 23, 24, 16]
references["uniformDie"] = solve([1, 6], die, [mpf(1) / 6] * 6, [[i] for i in range(6)], 0)

# Service times in classes of width 2 with an open last class: closed form of the grouped MLE.
service = [42, 20, 17, 8, 5, 8]
successes = sum(service[:-1])
failures = sum(j * f for j, f in enumerate(service))
q = mpf(failures) / (failures + successes)
lam = -mp.log(q) / 2
probabilities = [q**j * (1 - q) for j in range(5)] + [q**5]
references["exponentialService"] = solve([lam], service, probabilities,
                                         [[i] for i in range(6)], 1)

# Exam scores 30-100 in classes of width 10: moments from the midpoints, end classes opened.
scores = [3, 8, 17, 24, 16, 9, 3]
mids = [35 + 10 * i for i in range(7)]
n = sum(scores)
mean = mpf(sum(f * m for f, m in zip(scores, mids))) / n
sd = sqrt(fsum(f * (m - mean) ** 2 for f, m in zip(scores, mids)) / n)
cdf = [mpf(0)] + [erfc(-(x - mean) / (sd * sqrt(2))) / 2 for x in range(40, 100, 10)] + [mpf(1)]
references["normalScores"] = solve([mean, sd], scores, [b - a for a, b in zip(cdf, cdf[1:])],
                                   [[0, 1], [2], [3], [4], [5, 6]], 2)

target = Path(__file__).parents[2] / "src/features/data-entry/sampleReferences.json"
target.write_text(json.dumps(references, indent=2) + "\n")
for name, r in references.items():
    print(name, r)
