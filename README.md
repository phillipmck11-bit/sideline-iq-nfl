# Sideline IQ — NFL fantasy dashboard (GitHub Pages)

A self-contained, build-free, dark sports analytics dashboard. It works on
GitHub Pages with **zero paid services, keys, or background jobs**.

## What's inside

- `index.html`: the dashboard shell
- `assets/styles.css`: dark, responsive styling
- `assets/app.js`: interactive rankings, search, filters, player scouting
  panel, projected stat-line breakdowns, comparisons, research accuracy,
  and browser-based CSV exports
- `data/dashboard.json`: verified public-data snapshot
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
snapshot is frozen until you manually publish a new `dashboard.json`.

## Data & scoring

2026 Week 10 pregame projections use only weeks 1–9. The model is a
**transparent baseline**: 65% average of the last four observed games plus
35% season average. Matchup features appear as context, but they do not
change projected points. The 2025 view is retrospective, not a 2025
live forecast. Injuries and current-day player availability are not modeled.

Click **VIEW STATS** beneath a projected-point total to see estimated yards,
receptions, and touchdowns (or passing stats and interceptions for QBs).
Each stat uses the same 65% last-four / 35% season blend as projected fantasy
points. Scoring the unrounded estimates reproduces the underlying projection
before the original points are rounded to two decimals; displayed stat values
are rounded separately. Fractional TDs represent expected production,
not exact single-game outcomes. Comparisons also include the stat line.

Fantasy scoring:

- Passing: 0.05 per yard, 4 per TD, −2 per interception.
- Rushing and receiving: 0.1 per yard, 6 per TD.
- Receptions: 1 point for RB/WR, 1.5 for TE, 0 for QB.
- All other scoring categories are omitted as requested.

Weekly stats come from the freely available [nflverse Player Summary Stats
release](https://github.com/nflverse/nflverse-data/releases/tag/stats_player).
Research accuracy is drawn from the separately audited 2025 walk-forward
model comparison and remains participation-conditioned.

## Local preview

Any static server will work from this folder:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. Simply opening `index.html` as a local
file may prevent JavaScript from loading `data/dashboard.json`.

## Future refresh

The private research workspace includes `scripts/build_static_dashboard.py`
and `scripts/export_week11_rankings.py` to rebuild the published JSON from
verified free stats files. Automating this step is deferred until after the
dashboard is live, as requested.
