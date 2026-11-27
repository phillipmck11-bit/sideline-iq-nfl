# Sideline IQ 2.0 — validated 2026 static snapshot
As of 2026-11-27. Week 12 is partial. All figures below are derived from the five user-provided original nflverse release files, not from previous models.

## Reconciliation and coverage
- 581 players: 71 QB, 149 RB, 233 WR, 128 TE.
- 3,739 player-week records, weeks 1–12; 87 week-12 records. 581 native season rows. No duplicate player-week or season IDs; identical base player sets.
- Ten additive statistics reconcile exactly for every player: attempts, carries, targets, receptions, passing/rushing/receiving yards and TDs.
- NGS joins on exact GSIS ID and week, with separate native season joins on exact GSIS ID. Passing: 337/337 weekly, 37/37 season; rushing: 330/330 weekly, 46/46 season; receiving: 768/768 weekly, 116/116 season. Missing NGS observations remain null; no fuzzy name matching.
- 107 weekly and 108 season-level numeric fields, including 41 source NGS fields. Season NGS uses native week-0 values. Eight derived rates are ratios with missing/zero denominators producing null.
- Data sources: https://github.com/nflverse/nflverse-data/releases/tag/stats_player and https://github.com/nflverse/nflverse-data/releases/tag/nextgen_stats. Attribution: nflverse contributors and NFL Next Gen Stats; CC BY 4.0 per nflverse data license; filtered/joined and derived ratios by Sideline IQ. No third-party logos or headshots copied.
- PFR advanced charting, snaps, routes and play-by-play are not included. Historical 2020 onward backtesting and automated refresh deferred.

## Source file SHA-256
| File | SHA-256 |
|---|---|
| stats_player_week_2026.csv.gz | 8774dbf1f27cdae8df394caee616935175c1fbd0cee48a4a19485d7a13c5eb1f |
| stats_player_reg_2026.csv.gz | 1ac6eaa6bebb5fc38e70f914ecdd7b10d227ca1bfd8a0104e7f1444dc8282a1a |
| ngs_passing.csv.gz | 2771e4a58538f5f510d4d5d5b37a0b60dde5aed3c3c5547a8af574af222c46b1 |
| ngs_rushing.csv.gz | 329c9952719f23e87d9c8d30676dff164e2931f20fbff4bf33c7c2e32dbc2216 |
| ngs_receiving.csv.gz | d9042a7fb2152e3217f0dc375907fdfbbc7931535f55b21e6d8fad3ba55fc74b |

## Release artifacts
- data/v2/sideline-iq-2026-snapshot.json.gz: 501,182 bytes; SHA-256 c5fcfa44f4e8272e2a1b91903b85d7cbc0536ca2f65bf4bdd918f27d5e20f1da; Git blob 93a7a362135a9deabb8a950ba0ee6a381e939f4a. Compressed JSON contains manifest, weekly/season column arrays and row arrays.
- explorer-v2.html: 685,236 bytes; SHA-256 d1d9bd25221b8d92c790797df837993adf3c797a683f5fc2ed19e40616420042; Git blob 8f065892d87fe659626f0b2b9aa9409750225c09. Contains the same compressed snapshot embedded; no network dependency, no paid infrastructure.
- Browser tests: Chromium via Playwright set_content on the exact standalone HTML passed actual snapshot loading, 581 season rows, 233 WR filter, NGS scatter and regression, 87 week-12 rows, Aaron Rodgers weekly trend and CSV export. No page errors. Direct file:// and external navigation in the test environment were blocked by administrator policy; live GitHub Pages navigation has not been tested. Bar chart, quadrant, sample filters and table sorting are implemented but not yet covered by this completed browser test.
- Developer branch navigation links to explorer-v2.html. Main/live remain unchanged pending release review.
