# Sideline IQ — NFL fantasy dashboard (GitHub Pages)

A self-contained, build-free, dark sports analytics dashboard. It works on
GitHub Pages with **zero paid services, keys, or background jobs**.

## What's inside

- `index.html`: the dashboard shell
- `assets/styles.css`: dark, responsive styling
- `assets/app.js`: interactive rankings, search, filters, player scouting
  panel, projected stat-line breakdowns, comparisons, research accuracy,
  and browser-based CSV exports
- `assets/research-lab.js` and `data/research-v1.json`: 251-player, Week-9-cutoff
  research views for next game, next four scheduled games, ROS, descriptive
  production-vs-model signals, player explanations, scheduled weekly rows,
  2025 metric effectiveness, and historical error references
- `scripts/build_research_payload.py`: local-only, standard-library export
  script for turning the validated 251-player ZIP into the compact public JSON
- `tests/test_research_payload.py`: offline consistency and scoring checks
- `data/dashboard.json`: audited Week 10 pregame snapshot with **stat-first**
  fantasy projections, coherent projected box scores, and the previous 65/35
  baseline retained for instant comparison
- `.nojekyll`: tells Pages to serve static files unchanged

## Publish for $0

1. In GitHub, create a **new public repository** for just these site files,
   e.g. `sideline-iq-nfl`. Keep the separate research repository private.
2. Upload the contents of this folder to the **root** of the new public repo.
   Do not upload raw BigQuery exports, credentials, or the private research repo.
3. Open **Settings → Pages** in the new repository. Choose
   **Deploy from a branch → main → /(root)** and save.
4. Wait for GitHub's free Pages deployment to become available. The link is
   shown in **Settings → Pages** after publication.

The repository must be public under GitHub Free. Pages publishes a public
website; do not place secrets or non-public data in this folder.

No GitHub Actions workflows are required to host this site. The current
snapshots are frozen until you manually publish new JSON files.

## The two new research views

The **Multi-game forecasts** and **Value signals** views share
`data/research-v1.json`, while the earlier rankings and 2025 retrospective
views still use `data/dashboard.json`. This is deliberate: the new 251-player
horizon models and the previously validated single-game model are *not*
the same validation experiment.

- Multi-game forecasts: a sortable, filterable table covering 40 QBs, 75 RBs,
  100 WRs and 36 TEs. Player cards show box-score stats, next-game, next-four,
  ROS, 2,125 scheduled weekly rows in total, uncertainty references and
  player-specific explanations. CSV export is entirely in the browser.
- Value signals: modeled next-game fantasy points minus recent-six-appearance
  average, with positive/negative watchlists and observed opportunity proxies;
  includes the 2025 stat-level feature-ablation report by position.

**Research preview, not a separately approved production model.** The
14 structural checks passed and fantasy stats reconcile, but this release's
exact horizon models do not have an untouched 2026 holdout. The longer-term
weekly rows divide horizon residuals evenly, not by opponent. Error bands
are 2025 *historical absolute-error percentiles*, not calibrated individual
prediction intervals. Estimates assume the player participates, do not adjust
injuries/roster role, and do not establish independent underlying talent or
market price. Do not treat positive/negative gaps as automatic trade advice.

To regenerate the public research snapshot at $0, keep the validated research
ZIP on your own computer (outside the public repository), then run:

```sh
python3 scripts/build_research_payload.py --source-zip /path/to/NFL_251_Dashboard_Staging_Validated.zip
python3 -m unittest discover -s tests -p 'test_*.py'
```

Commit only the resulting `data/research-v1.json`, the page and code files;
do not upload the raw research ZIP or use scheduled GitHub jobs.

## Data & scoring

2026 Week 10 pregame projections use only weeks 1–9 of 2026, plus 2024–25
historical training. The **default is a validated stat-first model**: it
predicts carries, targets, passing attempts, yards, receptions, touchdowns,
and interceptions separately, then applies the user's exact fantasy scoring.
QB and TE use independent nonlinear models for each stat; RB and WR use
regularized linear stat models that exclude past fantasy points as inputs.
All outputs are reconciled so receptions never exceed targets and touchdowns
never exceed their related opportunities. BYE players receive zero game
projections. The **Model** selector switches to the previous 65% last four /
35% same-season historical-stat baseline without removing that reference.

The 2025 view remains retrospective, not a live forecast. Injuries and
current-day player availability are not modeled.

Click **VIEW STATS** beneath a projected-point total to see estimated yards,
receptions, and touchdowns (or passing stats and interceptions for QBs).
The player drawer includes **every stat and its point contribution** under the
league's scoring. The score is calculated from **full-precision** stat
projections, then displayed to two decimals. Fractional TDs represent expected
production, not single-game realized outcomes. Comparisons and CSV exports
also include the projected stat line.

Fantasy scoring:

- Passing: 0.05 per yard, 4 per TD, −2 per interception.
- Rushing and receiving: 0.1 per yard, 6 per TD.
- Receptions: 1 point for RB/WR, 1.5 for TE, 0 for QB.
- All other scoring categories are omitted as requested.

Weekly stats come from the freely available [nflverse Player Summary Stats
release](https://github.com/nflverse/nflverse-data/releases/tag/stats_player).
The model families were selected during the 2025 walk-forward tests and then
validated with frozen 2024–25 weights against 2,616 2026 player-games in
Weeks 1–9. Across the four positions, the 2026 MAE gains over the 65/35
baseline were QB 6.8%, RB 4.4%, WR 7.9%, and TE 8.8%. The audited model
accuracy remains **participation-conditioned**, not a perfect active-roster
or injury forecast.

Standard opponent/team history is included in the default stat models. New
opponent-quality-adjusted features are **research only**: they helped QB and RB
accuracy in exploratory 2026 tests but did not improve WR/TE models. They have
not been added to the public projections pending another untouched holdout.

## Local preview

Any static server will work from this folder:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. Simply opening `index.html` as a local
file may prevent JavaScript from loading `data/dashboard.json`.

## Future refresh

The companion private research workspace includes
`scripts/build_week10_stat_first_dashboard.py` to build the stat-first JSON
snapshot from the prior-week historical player-game data, saved baseline
dashboard, and frozen 2025 model choices. The public site stores only the
derived static JSON. **Do not run the older baseline-only builder after this
integration without reapplying the stat-first overlay.** Weekly automation
is deferred, as requested.

