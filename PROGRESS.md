# Sideline IQ V2 progress
## 2026-11-27 — ingestion foundation
- Inspected complete branch tree; legacy dashboard remains intact; no previous progress log.
- Verified upstream release asset names. Deprecated player_stats tag replaced by stats_player. NGS combined assets exist but 2026 coverage not yet verified.
- 9a64059e2bf43f3a895cca0a197c08e63190a4e5: local-only standard-library ingestion for regular-season QB/RB/WR/TE player-week stats, 2026 default, historical years optional, identity validation, null handling, atomic JSON output.
- 489850b82f0cefa553f0077a1086dcc2cc721b09: source catalog and publication gates.
- 40bdc50db9f0aba3d6e8a5e839faee0e494fbb8e: synthetic regression tests.
- Verified all three files by reading back from branch. Tests not executed; no real data downloaded yet. No paid compute or workflow enabled; main unchanged.
- Next: run python -m unittest discover -s tests -p test_acquire_v2.py and python scripts/acquire_v2.py --years 2026 in an available local execution environment. Verify source headers, week coverage, player counts and numeric/text field types. If execution unavailable, continue building a local-file-import explorer and testable aggregation logic, without claiming live data. Add NGS ingestion and crosswalk validation after checking source schemas; review redistribution terms before publishing any datasets. Add local-data/ to .gitignore. No user action currently needed.

## 2026-11-27 — local validation and explorer
- Reconstructed fetched ingestion functions and all five synthetic tests in the local Python environment: 5/5 passed. The full branch could not be cloned because github.com DNS resolution failed. Direct urllib acquisition also failed with URLError [Errno -3] Temporary failure in name resolution. Actual player data, current coverage and schema remain unverified.
- 8eb74c1b0271dd9db7f682badd5ba398ed30b20d: standalone explorer-v2.html with local JSON import, identity validation, metric selectors, position/week/player filters, sorting, scatter chart and CSV export. Player-week grain only; no real data bundled. Browser behavior not yet tested.
- 45a13723f40b3979cc4b512129b957e0ba33dd12: ignore local-data and Python caches. Both files read back successfully.
- Next: test explorer in a browser with synthetic fixture; implement explicit metric-aware season aggregation and source-specific advanced stat joins; retry real data ingestion in a network-enabled free execution environment. No data redistribution or paid compute enabled. Main unchanged. Hourly task unchanged.
