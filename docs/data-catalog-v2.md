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

## Static 2026 delivery
- Main nflverse release datasets are broadly CC BY 4.0 per https://github.com/nflverse and https://github.com/nflverse/nflverse-data/blob/main/LICENSE.md; FTN is separately CC BY-SA 4.0. Attribute nflverse and named underlying provider; link license, identify filtering/join transformations, preserve source URLs. Do not infer rights for other sources or publish third-party logos/headshots merely because their URLs occur in data.
- Weekly base: https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2026.csv.gz
- Regular season native aggregate: https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_reg_2026.csv.gz
- Combined NGS assets: https://github.com/nflverse/nflverse-data/releases/download/nextgen_stats/ngs_passing.csv.gz ; ngs_rushing.csv.gz ; ngs_receiving.csv.gz (same directory). Actual 2026 coverage unverified. NGS joins use player_gsis_id + week + season; see https://nflreadr.nflverse.com/articles/dictionary_nextgen_stats.html.
- Offline ingest: python scripts/acquire_v2.py --years 2026 --input /path/to/stats_player_week_2026.csv.gz ; optional NGS: python scripts/join_ngs_v2.py --base local-data/v2/player-week-2026.json --passing /path/to/ngs_passing.csv.gz --rushing /path/to/ngs_rushing.csv.gz --receiving /path/to/ngs_receiving.csv.gz --out local-data/v2/player-week-2026-enriched.json. Validate and assess per-field provenance before publishing. Explorer accepts raw 2026 weekly CSV/gzip directly, or normalized JSON, and loads ./data/v2/player-week-2026.json if an approved snapshot is present. No weekly refresh work until separately requested.
