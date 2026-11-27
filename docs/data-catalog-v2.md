# V2 source catalog — 2026-11-27

Release asset names verified via GitHub release metadata, not yet downloaded or schema-validated. Public availability is not a redistribution license. Keep acquired data local until rights are reviewed.

| Source | Release tag / asset | Grain | Status |
|---|---|---|---|
| nflverse player stats | stats_player / stats_player_week_2026.csv.gz | player-week | asset verified; ingestion implemented |
| Next Gen Stats | nextgen_stats / ngs_passing.csv.gz, ngs_receiving.csv.gz, ngs_rushing.csv.gz | player-week plus aggregate rows | combined assets verified; 2026 coverage unverified |
| Snap counts | snap_counts / snap_counts_2026.csv.gz | player-game | asset verified; PFR ID crosswalk needed |
| PFR advanced | pfr_advstats / advstats_week_pass_2026.csv.gz, advstats_week_rec_2026.csv.gz, advstats_week_rush_2026.csv.gz | player-week | asset verified; rights and crosswalk pending |

Base: https://github.com/nflverse/nflverse-data/releases
Dictionary: https://nflreadr.nflverse.com/articles/

Canonical key: GSIS player ID, season, regular-season week. Never join on display name alone. Keep missing values null, never zero-fill missing sources. Do not aggregate weekly rates without their proper denominators. Keep source retrieval date and coverage. Historical years 2020–2025 are for backtesting, not the default view. Route metrics deferred. No predictive model or grades in this phase.

The old player_stats release is explicitly deprecated; use stats_player instead.
