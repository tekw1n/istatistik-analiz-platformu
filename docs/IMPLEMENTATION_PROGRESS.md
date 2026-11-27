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
| 3 | Done, approved; merged as `d38d807` | `feat/phase-03-parameter-estimation` | `bbcb668`, `ce0d85a`, `d05d9a6`, `ad113e0`, `c6e21cb`, `d1355de` | [#4](https://github.com/tekw1n/istatistik-analiz-platformu/pull/4) | 481 passed in total, build succeeds |
| 4 | Done, approved; merged as `244c2e1` | `feat/phase-04-chi-square-engine` | `d1d7744`, `cec902e`, `5251e9f`, `53601fb`, `fabde07` | [#5](https://github.com/tekw1n/istatistik-analiz-platformu/pull/5) | 515 passed, build succeeds |
| 5 | Done, approved; merged as `0f30cbd` | `feat/phase-05-data-entry` | `4dcdba7`, `8f7f301`, `9435130`, `869fd75`, `d4f8549` | [#6](https://github.com/tekw1n/istatistik-analiz-platformu/pull/6) | 601 passed, build succeeds; manual browser smoke test (Chromium) |
| 6 | Done, awaiting user approval | `feat/phase-06-analysis-ui` | `6f94ca2`, `3635657`, `84c2e23`, `4e60178` | PR_LINK | 650 passed, build succeeds; browser smoke test (Chromium) |
| 7–9 | Not started | | | | |

Merge commit hashes are recorded at the start of the following phase, because a commit cannot contain its own merge hash.

## Known bugs and gaps

- Charts and the probability calculator are not built yet (Recharts is added in Phase 7).
- The production bundle is one chunk above 500 kB (KaTeX); Vite warns about it.
- Open point: with grouped data the end classes are opened to ±∞, so a Continuous Uniform fit can give a negative lower bound even for non-negative data (for example a = −4,72 in the service time sample). Raised in the Phase 6 report.
- Tables show at most 500 rows (totals cover all rows).
- There are no automated UI component tests; parsing, validation and samples are unit tested.
- Raw data entries accept one variable of at most 100,000 values; CSV files up to 5 MB. Quoted fields spanning several lines are not supported.
- `regularizedGammaP/Q` are limited to shapes up to about 1e6 (see the `shortcut:` comment in `src/math/gamma.ts`).
- Binomial supports n up to 1e6 (tails are summed term by term); Poisson and Gamma inherit the incomplete gamma limit.
- The chi-square test allows at most 10,000 discrete classes (for example Binomial n above 9,999 is rejected).
- By user decision, Poisson, Geometric and Discrete Uniform fits without an E < 5 merge are not flagged as approximate, although a tail closed as X ≥ k (or the non-regular min/max estimator) makes them slightly so.
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
- p-value flags: see Phase 4 decisions (they replace the Phase 3 behaviour).
- Grouped MM uses class midpoints without Sheppard's correction and is unavailable when any class is open.

## Phase 4 decisions

- `chiSquareTest(id, observations, model, { alpha })` accepts an MM or MLE estimation or the result of `manualParameters`. The status is `ok`, `impossible` or `insufficient-df`.
- p-value flag: `pValueApproximate` (always) is set for MM, continuous raw-data MLE and manual parameters marked as estimated. `approximateIfMerged` is set for discrete value MLE and for grouped / censored MLE; the test turns the flag on only when a merge happens. External parameters are never flagged. (User decision; applied to grouped continuous MLE for the same reason.)
- Discrete classes: one per integer from the support minimum (or lower observed value) to the support maximum, or to the largest observed value with an `X ≥ k` last class.
- Continuous classes: the first and last class are opened to ±∞. Grouped MLE now uses the same opened classes (it used closed ends in Phase 3, which did not match the test).
- Continuous raw data must be binned before the test (Phase 5).
- A class with probability 0 and O > 0 gives `impossible` before any merging.
- Rounding tolerance 1e-9 is used for `E < 5` and for equal neighbour E values.

## Phase 5 decisions

- Three tabs (frequency table, grouped table, raw data / CSV) produce a `Dataset`: `observations` for estimation and, for raw data, Sturges `classes` for testing continuous distributions.
- Number format: tab, then semicolon, then comma decide the delimiter. In a comma-only text the comma is a decimal mark only if every token with a comma looks like one decimal number; the UI says so and offers an explicit Turkish / Standard choice.
- Nothing is skipped silently: every non-numeric cell is reported. A CSV with a header and several columns requires choosing a column. Non UTF-8 files are read as Windows-1254.
- Sturges classes are [a, b) with the last class closed; the width is rounded up to the data precision, so there can be fewer than k classes.
- Design system: light theme, tokens in `src/index.css` (`@theme`), system fonts (no external requests), tabular figures for numbers, 44px controls.
- Five samples (Poisson, Binomial, Discrete Uniform, Exponential, Normal); three of them show E < 5 merging. References come from `tests/data-entry/generate_sample_references.py`.

## Phase 6 decisions

- All numbers go through `formatNumber` / `texNumber` (`src/utils/format.ts`): decimal comma, scientific notation below 1e-4.
- Flow: data entry → preliminary analysis → tabs "single analysis" / "comparison". Settings live in `App` and a loaded sample presets distribution, mode, α, n and manual values.
- Distribution filtering ignores the Binomial n; violations of 0..n are reported once n is entered.
- A discrete frequency table cannot be used with continuous distributions.
- The comparison uses MLE (moments only without a likelihood solution), lists invalid and inapplicable distributions separately and sorts valid tests by p-value with a warning.
- The raw table marks E < 5 rows with colour and text; only the final table totals to χ².
- A formula bug from Phase 3 (a lost backslash printed ";" in two formulas) was found and fixed.

## Next: Phase 7

1. Observed / expected frequency charts and theoretical curves (Recharts).
2. Interactive probability calculator: P(X = a), P(X ≤ a), P(a ≤ X ≤ b).
