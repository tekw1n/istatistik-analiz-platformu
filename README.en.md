[Türkçe](README.md) | **English**

**Live demo:** <https://tekw1n.github.io/istatistik-analiz-platformu/>

# Probability Distributions and Chi-Square Goodness-of-Fit Platform

An interactive web application for a university statistics course. The whole user interface is in Turkish. Every calculation runs in the browser: there is no backend and no data leaves the device.

## Features

- **Data entry:** discrete frequency table (with an open class X ≥ k), grouped continuous table (with open end classes), raw data and CSV (Turkish `;` + decimal comma and standard CSV), spreadsheet paste, Sturges classification, five sample problems.
- **Distributions:** Binomial, Poisson, Discrete Uniform, Geometric (both definitions), Bernoulli, Normal, Exponential, Continuous Uniform, Gamma, Log-Normal.
- **Estimation:** Method of Moments and Maximum Likelihood (raw, frequency table, grouped and censored data), or manual parameters.
- **Chi-Square test:** expected frequencies, tail closing, merging of classes with E < 5 with its history, statistic, p-value, critical value and decision.
- **Presentation:** step-by-step formulas, comparison of all applicable distributions, charts, probability calculator, printable A4 report.

## Run locally

Requires Node.js 22.12 or newer.

```bash
npm ci
npm run dev       # development server, http://localhost:5173
npm test          # unit tests (Vitest)
npm run build     # type check and production build into dist/
npm run preview   # serve the production build
```

## Statistical conventions

| Topic | Convention |
|---|---|
| Variances | s² divides by N − 1; the moment variance m₂ divides by N and is used by both estimators of σ² |
| Binomial | n is known; only p is estimated |
| Geometric | Trials (X = 1, 2, …) by default; failures (X = 0, 1, …) selectable |
| Normal, Log-Normal | Parameterised by σ (σ² is shown as well) |
| Exponential, Gamma | Rate λ; shape α and scale θ |
| Grouped likelihood | Maximises Σ fᵢ ln Pᵢ(θ); midpoints are never treated as observations |
| Test classes | End classes of continuous data are opened to ±∞, so ΣEᵢ = N |
| Merging | Lower tail, then upper tail, then the leftmost interior class with E < 5 into its smaller neighbour (left on a tie) |
| Degrees of freedom | k' − 1 − m, where m counts parameters estimated from the tested data; no test when it is ≤ 0 |
| Decision | Reject H₀ when p < α. Not rejecting never proves that a distribution is correct |

A p-value is marked approximate when the parameters were not estimated by maximum likelihood from the final test classes: moment estimates, raw continuous data, manual values marked as estimated, and likelihood fits whose classes were merged afterwards.

## Architecture

```text
src/
├── math/            special functions, root finding, integration, optimisation, statistics
├── distributions/   ten distributions, catalog, estimation
├── chiSquare/       classes, merging, statistic, hypothesis test
├── features/        data entry, analysis, comparison, calculator, report
├── components/      shared UI and charts
└── utils/           Turkish number formatting
tests/               unit tests, reference generators, architecture rules
```

`math`, `distributions` and `chiSquare` are plain TypeScript without React or DOM access, and depend only downwards. `tests/architecture.test.ts` enforces this and rejects import cycles. The decisions and history of every development phase are in [docs/IMPLEMENTATION_PROGRESS.md](docs/IMPLEMENTATION_PROGRESS.md).

## Reference values

Numerical references are produced with [mpmath](https://mpmath.org/) independently of the TypeScript code. To regenerate them (needs Python 3 and `pip install mpmath`):

```bash
for script in tests/*/generate*references.py; do python3 "$script"; done
git diff --stat   # no change expected
```

## Deployment

The build in `dist/` is a static site with relative asset paths, so it works at a domain root and in a subdirectory.

### Vercel

1. Sign in at [vercel.com](https://vercel.com) with GitHub and choose **Add New… → Project**.
2. Import this repository.
3. Keep the detected settings: framework **Vite**, build command `npm run build`, output directory `dist`. No environment variables are needed.
4. Press **Deploy**. Every later push to `main` is deployed automatically.

From a terminal instead: `npx vercel` for a preview, `npx vercel --prod` for production.

### GitHub Pages

The workflow `.github/workflows/deploy-pages.yml` tests, builds and publishes the site. It starts only when run by hand.

1. In the repository open **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Open **Actions → Deploy to GitHub Pages → Run workflow** on `main`, or run `gh workflow run deploy-pages.yml`.
3. This repository is published at <https://tekw1n.github.io/istatistik-analiz-platformu/> (a fork appears at `https://<user>.github.io/<repository>/`).

To publish on every push to `main`, add this under `on:` in the workflow:

```yaml
  push:
    branches: [main]
```

## Known limitations

- Shape or mean parameters far above one million cannot be evaluated; the application says so instead of showing a result.
- Binomial n is limited to 1,000,000, and a chi-square test to 10,000 discrete classes.
- Grouped and censored likelihoods are solved numerically (relative accuracy about 1e-7); grouped two-parameter fits need at least three occupied classes.
- For grouped data a Continuous Uniform fit can leave the bounds of the table; a warning is shown.
- Raw data accepts one variable of up to 100,000 values (CSV files up to 5 MB); quoted fields spanning lines are not supported.
- Charts show at most 60 classes or 300 discrete values; tables show at most 500 rows (the report data table 200). Totals cover all rows.
- Browser checks were done with Chromium only. Firefox, Safari, physical printing and screen readers have not been tested. There are no automated UI component tests.
