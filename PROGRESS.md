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

## 2026-11-27 — static snapshot integration preparation
- Verified upstream metadata: weekly 2026 CSV.gz 752812 bytes, regular-season aggregate CSV.gz 143340 bytes; both exist. Combined NGS passing/rushing/receiving gzip assets exist, 2026 coverage unknown. Retry direct download failed with DNS; connector release URLs returned 404; web fetch disabled. No actual data acquired in this run. User browser download/upload is now the concrete fallback.
- d076f023b376ad5df64c5267c17eacd0bf637465 and 248410201acef3097877ea97b536ca98e97f970f: offline CSV/gzip input, attribution, game_id preservation and CSV structural validation.
- 460664f52e6d9af30e75d27d59ff1e3c6d1f83c2 and 30718a35b1b651cc4e2463b3165a392991fcca52: browser imports original weekly CSV/gzip or normalized JSON, plus approved static snapshot auto-load. Nine assertions passed on copied parser in Node before game_id preservation change; full browser test not executed.
- 8678e9eb314896220a6c08222c3f9b33ae5212ff and 2bc440538992c34ab681c0b1eed3aabc8ded1fd5: offline NGS identity joins with coverage reports and five synthetic tests; tests not yet run. All four changed code/test files read back from branch. Source catalog updated with license and offline instructions.
- Next: acquire user-uploaded source files or retry free download; execute full tests and inspect data coverage; reconcile totals and NGS joins, add safe season-level view, package approved static snapshot (remove/avoid unrelated third-party imagery), verify browser behavior, then present release for review. Weekly refresh deferred. No new spending, no main deployment. Hourly automation retained.

## 2026-11-27 — player totals view
- Retried direct source download in container: curl error 6, could not resolve github.com. No uploaded source files in runtime. Existing model outputs not reused.
- 7e375a186bf7afd305b731278a7e1c2a3d2eccd0: explicit additive metric whitelist and ratio-of-totals aggregation; missing inputs remain null; unknown and NGS rate metrics excluded from totals.
- 6a5008de85c8fc03c265f5d8cd736e09e930b4a4: nine regression assertions added (not executed this run).
- 640d63d84002157bb414fad58307e9ba5ea9fc08: player totals through selected week view integrated into explorer; read back from branch. Browser tests pending. Real source files remain necessary; user already notified in prior session. No main deployment or paid services. Next: execute tests, validate actual snapshot and reconcile totals, then release review.

## 2026-11-27 — snapshot release audit
- a43046ab4bc4212eb7894f2cd30ad153a64d82ea: added scripts/audit_snapshot_v2.py to check 2026 GSIS identity, unique player-weeks, contiguous weeks, all four positions, finite metrics, counts and per-metric coverage. Read back exact contents; execution pending. Structural audit is not proof of source accuracy.
- Retried curl: DNS failure (error 6); /mnt/data empty. Real-data validation remains blocked pending source files or restored networking. Next: run audit and regression suites on actual source snapshot, reconcile totals, test browser, review release. No refresh work, paid services or main changes.
