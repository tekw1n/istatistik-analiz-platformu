# Implementation Progress

Read this file and check `git status` / `git log` at the start of every session. Do not redo completed phases.

## Project goal

An interactive, fully Turkish web platform for a university statistics course: probability distributions, Method of Moments (MM) and Maximum Likelihood (MLE) estimation, and the Chi-Square goodness-of-fit test on raw data, discrete frequency tables and grouped continuous data. It must explain each calculation step, compare distributions and produce an academic report.

Priorities, in order:

1. Mathematical and statistical correctness.
2. Transparent, auditable calculations.
3. Usable, clear academic UI.
4. Modular, testable code.

## Initial decisions (approved by the user)

| # | Topic | Decision |
|---|---|---|
| 1 | Binomial `n` | Always known; only `p` is estimated (m = 1). Estimating `n` is not in the first version. |
| 2 | Geometric support | Default is number of trials, X = 1, 2, 3, ... The failures definition, X = 0, 1, 2, ..., is also supported and selectable in the UI. |
| 3 | Open-ended classes | Supported for the first and last class. Grouped tables: the user states the open class and its frequency. Raw data: the program opens the end classes to the support bounds of the distribution and counts frequencies. |
| 4 | Merging when E < 5 | See the rule below. |
| 5 | User flow | Data entry → Preliminary analysis → Distribution selection → Parameter estimation → Chi-Square analysis → Charts and report. |

### Merge rule

1. While the first class has E < 5, merge it with its right neighbour.
2. While the last class has E < 5, merge it with its left neighbour.
3. While an interior class has E < 5, take the leftmost one and merge it with the neighbour that has the **smaller** E. On a tie, use the left neighbour.
4. Stop when every class has E ≥ 5 or only one class remains. Record every step.

Merging preserves the totals of O, E and p.

## Statistical rules

- Class probability p_i = P(X ∈ C_i), expected frequency E_i = N·p_i, and ΣE_i = N. Observed and expected classes cover the same intervals.
- Statistic: χ² = Σ(O − E)² / E. A class with E = 0 and O > 0 is reported as "the model makes the observed data impossible"; no division is performed.
- Degrees of freedom: df = k' − 1 − m. The test is not applicable when df ≤ 0.
- m counts parameters estimated from the same data, even if typed in manually. Externally known parameters do not count.
- p-value = Q(df/2, χ²/2). The critical value is the numerical inverse of the CDF; no lookup tables. Reject H0 when p < α.
- α is 0.01, 0.05, 0.10 or a custom value.
- Sample variance uses N − 1; the moment variance m2 uses N. Skewness g1 = m3 / m2^(3/2).
- Grouped-data MLE maximises Σ f_i ln P_i(θ). Class midpoints are never treated as observations in MLE. Midpoint-based statistics are labelled approximate.
- When MM cannot be computed because of open-ended classes, the reason is shown.
- A higher p-value is never presented as proof that a distribution is correct.

## Resolved points (approved at the start of Phase 3)

- Discrete uniform: MLE â = min, b̂ = max. MM: h = (√(12·m2 + 1) − 1) / 2, a = x̄ − h, b = x̄ + h; the raw result is shown, the nearest integers are used in the test and the user is warned if they do not cover the data.
- p-value: keep df = k' − 1 − m and show "p-value is approximate" (Chernoff–Lehmann) when parameters were estimated from observation values.
- Normal and Log-Normal results show both σ̂ and σ̂², with a note that m2 (divisor N) is used.

## Technology and architecture

React, TypeScript (strict), Vite, Tailwind CSS, Recharts, Vitest, KaTeX. Frontend only: no backend, no database, user data never leaves the browser. Deployable to GitHub Pages and Vercel.

```text
src/
├── math/              gamma, erf, normal, rootFinding, numericalIntegration, statistics
├── distributions/     discrete/, continuous/, estimation/, distributionTypes.ts
├── chiSquare/         probabilities, expected frequencies, merging, statistic, df, p-value, critical value, test
├── features/          data-entry, preliminary-analysis, parameter-estimation, distribution-comparison,
│                      goodness-of-fit, probability-calculator, reporting
├── components/        layout, tables, charts, forms, ui
├── types/
├── utils/
└── App.tsx
tests/                 math, distributions, estimation, chiSquare, integration
```

Rules:

- Dependencies point one way: `features` → `chiSquare` → `distributions` → `math`.
- `math`, `distributions` and `chiSquare` do not depend on React, the DOM or browser state.
- The tree is a reference. Create a folder or file only when a phase needs it.

## Phase plan

| Phase | Branch | Scope |
|---|---|---|
| 0 | `chore/phase-00-project-setup` | Environment check, GitHub repository, architecture and plan |
| 1 | `feat/phase-01-math-core` | Project scaffold; Gamma, log-Gamma, regularized incomplete Gamma, Digamma, normal CDF/SF, root finding and inversion, numerical integration, basic statistics |
| 2 | `feat/phase-02-distributions` | Ten distributions: PMF/PDF, CDF, SF, interval probability, support and parameter validation |
| 3 | `feat/phase-03-parameter-estimation` | MM, MLE, raw and grouped estimation, manual parameters, estimated parameter count |
| 4 | `feat/phase-04-chi-square-engine` | Class probabilities, expected frequencies, tail closing, merging, statistic, p-value, critical value, decision, end-to-end tests |
| 5 | `feat/phase-05-data-entry` | Frequency table, grouped table, raw data, CSV, spreadsheet paste, Sturges, sample problems |
| 6 | `feat/phase-06-analysis-ui` | Summary cards, distribution selection, estimation screen, single analysis, comparison, tables |
| 7 | `feat/phase-07-charts-calculator` | Observed/expected charts, theoretical curves, probability calculator |
| 8 | `feat/phase-08-reporting-design` | Print/PDF report, responsive layout, accessibility, error and empty states |
| 9 | `test/phase-09-final-validation` | Full test run, build, repository check, deployment documentation |

## Workflow

- One branch per phase, cut from an up-to-date `main`. The only direct commit on `main` is the bootstrap `.gitignore` commit.
- Conventional Commits in English. Pull request descriptions in Turkish.
- Per phase: tests and build → commits → push → PR → `gh pr merge --merge --delete-branch --author-email 234227956+tekw1n@users.noreply.github.com` → `git pull --ff-only origin main`.
- Never force-push or delete `main` or unmerged branches.
- Commit email is set locally to the GitHub noreply address; merges need the `--author-email` flag as well. Merge commit `1cc734a` carries the personal address; the user chose to leave it.
- Stop after each phase, report, and wait for explicit approval.

## Progress

| Phase | Status | Branch | Commits | PR | Tests |
|---|---|---|---|---|---|
| Bootstrap | Done | `main` | `7f91b34` | — | — |
| 0 | Done, approved; merged as `1cc734a` | `chore/phase-00-project-setup` | `50295a5` and the progress-record commit | [#1](https://github.com/tekw1n/istatistik-analiz-platformu/pull/1) | Not applicable, no code yet |
| 1 | Done, approved; merged as `f579184` | `feat/phase-01-math-core` | `a0e512e`, `e0255d1`, `a6c88f2`, `b150115` | [#2](https://github.com/tekw1n/istatistik-analiz-platformu/pull/2) | 264 passed, build succeeds |
| 2 | Done, approved; merged as `8c1afa7` | `feat/phase-02-distributions` | `d84dfd5`, `8b914f1`, `4b7bc9b`, `9d0e249`, `30b2b8d` | [#3](https://github.com/tekw1n/istatistik-analiz-platformu/pull/3) | 426 passed in total, build succeeds |
| 3 | Done, awaiting user approval | `feat/phase-03-parameter-estimation` | `bbcb668`, `ce0d85a`, `d05d9a6`, `ad113e0`, `c6e21cb`, `d1355de` | [#4](https://github.com/tekw1n/istatistik-analiz-platformu/pull/4) | 481 passed in total, build succeeds |
| 4–9 | Not started | | | | |

Merge commit hashes are recorded at the start of the following phase, because a commit cannot contain its own merge hash.

## Known bugs and gaps

- The UI is only a Turkish placeholder page. Tailwind CSS, Recharts and KaTeX are added in the phases that first use them.
- `regularizedGammaP/Q` are limited to shapes up to about 1e6 (see the `shortcut:` comment in `src/math/gamma.ts`).
- Binomial supports n up to 1e6 (tails are summed term by term); Poisson and Gamma inherit the incomplete gamma limit.
- `integrate` handles finite intervals only and can miss a feature narrower than 1/32 of the interval.

## Phase 1 decisions

- `erf` / `erfc` are computed from the regularized incomplete gamma, so one implementation serves erf, normal and χ² tails. The planned `specialFunctions.ts` was not needed.
- `inverseRegularizedGammaQ(a, α)` inverts the upper tail directly; the χ² critical value is `2 · inverseRegularizedGammaQ(df / 2, α)`.
- `logGamma` and `digamma` accept x > 0 only; `gamma` also accepts negative non-integers.
- `describe` returns null for undefined statistics. CV and variance/mean ratio use s² (divisor N − 1) and are defined only for a positive mean.
- Reference values come from `tests/math/generate_references.py` (mpmath, 40 digits), independent of the TypeScript code.

## Phase 2 decisions

- Each distribution is a factory returning `cdf`, `sf` and `pmf` or `pdf`; invalid parameters throw a `RangeError` with a Turkish message.
- `createDistribution.ts` clips every function to the support in one place. `intervalProbability(d, a, b)` is P(a ≤ X ≤ b), accepts infinite bounds and subtracts the tail that avoids cancellation.
- Normal and Log-Normal take σ (standard deviation), not σ². Exponential takes the rate λ; Gamma takes shape α and scale θ.
- Gamma and Log-Normal have the support x > 0; Exponential has x ≥ 0.
- Geometric takes the definition `'trials'` (default) or `'failures'`. Bernoulli is separate from Binomial.
- `catalog.ts` holds Turkish names, parameter descriptions and `checkData` for data support.
- Moments and MLE are not part of the distribution objects; they belong to Phase 3.

## Phase 3 decisions

- `estimateParameters(id, observations, options)` returns `{ mm, mle }`; an unavailable method carries a Turkish reason. `manualParameters` is mode B.
- Observations are `values` (raw data or frequency table, optionally with a discrete open tail X ≥ k) or contiguous `classes` (grouped continuous).
- Grouped and censored MLE maximise Σ f ln P_i(θ) numerically (Nelder–Mead, `src/math/optimization.ts`); relative accuracy is about 1e-7, not machine precision. The m2 note applies to raw-data MLE and to MM, not to grouped MLE.
- Grouped two-parameter MLE requires at least 3 occupied classes.
- Open tails are supported for Poisson, Geometric and Binomial only.
- `pValueApproximate` is true for MM (including midpoint-based), for raw-data / frequency-table MLE and for manual parameters marked as estimated; false for grouped and censored MLE and for external parameters. Merging classes after a censored discrete fit also makes it approximate: Phase 4 must set the flag then.
- Grouped MM uses class midpoints without Sheppard's correction and is unavailable when any class is open.

## Next: Phase 4

1. Class probabilities and expected frequencies (Σ E = N), including discrete tail closing.
2. Merging for E < 5 with history, statistic, degrees of freedom, p-value, critical value, decision.
3. Set `pValueApproximate` after merging where needed; end-to-end textbook tests.
