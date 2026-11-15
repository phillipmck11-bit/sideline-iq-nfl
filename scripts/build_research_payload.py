"""Create a build-free Sideline IQ research data snapshot from the validated ZIP.

Usage: python scripts/build_research_payload.py --source-zip /path/to/NFL_251_Dashboard_Staging_Validated.zip

This runs locally with Python's standard library. It never contacts GitHub,
calls an API, or triggers a billable job. The input ZIP remains outside the
public dashboard repository; only the compact JSON snapshot is deployed.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import math
from collections import Counter, defaultdict
from pathlib import Path
from zipfile import ZipFile

BASE_DIR = Path(__file__).resolve().parents[1]
SCORING = {
    "passing_yards": 0.05,
    "passing_tds": 4.0,
    "interceptions": -2.0,
    "rushing_yards": 0.1,
    "rushing_tds": 6.0,
    "receiving_yards": 0.1,
    "receiving_tds": 6.0,
    "catches": {"QB": 0.0, "RB": 1.0, "WR": 1.0, "TE": 1.5},
}
POSITIONS = {"QB": 40, "RB": 75, "WR": 100, "TE": 36}
STAT_NAMES = ("passing_yards", "passing_tds", "interceptions", "rushing_yards",
              "rushing_tds", "receiving_yards", "receiving_tds", "catches")


def read_csv(archive: ZipFile, filename: str) -> list[dict]:
    with archive.open(filename) as source:
        return list(csv.DictReader(io.TextIOWrapper(source, encoding="utf-8-sig")))


def floating(value: str) -> float:
    number = float(value)
    if not math.isfinite(number):
        raise ValueError(f"Non-finite numerical input: {value}")
    return number


def fantasy_points(stats: dict, position: str) -> float:
    return sum(float(stats[k]) * (SCORING[k][position] if k == "catches" else SCORING[k]) for k in STAT_NAMES)


def build(zip_path: Path) -> dict:
    with ZipFile(zip_path) as archive:
        summaries = read_csv(archive, "player_projection_summary.csv")
        weekly = read_csv(archive, "weekly_projection_rows.csv")
        cards = json.loads(archive.read("player_research_cards.json"))
        release = json.loads(archive.read("RELEASE_GATE.json"))
        effectiveness = read_csv(archive, "metric_effectiveness_2025.csv")
        ablation = read_csv(archive, "metric_feature_ablation_2025.csv")
        next_game_metrics = read_csv(archive, "next_game_metric_effectiveness_2025.csv")

    if not all(release["checks"].values()):
        raise ValueError("Research release did not pass all structural checks")
    if len(summaries) != 251 or len(cards) != 251 or len(weekly) != 2125:
        raise ValueError("Unexpected player or weekly row counts")
    if Counter(r["position"] for r in summaries) != POSITIONS:
        raise ValueError("Unexpected position breakdown")

    by_id = {p["player_id"]: p for p in cards}
    by_week = defaultdict(list)
    seen_weeks = set()
    for row in weekly:
        pid = row["player_id"]
        week = int(row["week"])
        if week <= 9 or week > 18 or (pid, week) in seen_weeks:
            raise ValueError(f"Invalid or duplicated future week for {pid}: {week}")
        seen_weeks.add((pid, week))
        stats = {name: floating(row[name]) for name in STAT_NAMES}
        fp = floating(row["fantasy_points"])
        if any(val < 0 for val in stats.values()) or fp < -0.00001:
            raise ValueError("Unexpected negative forecast")
        if pid not in by_id or abs(fp - fantasy_points(stats, by_id[pid]["position"])) > .0002:
            raise ValueError("Fantasy score did not reconcile")
        by_week[pid].append({
            "week": week, "opponent": row["opponent"], "home_away": row["home_away"],
            "fantasy_points": fp, "stats": stats,
            "allocation": "dedicated next-game" if row["method"] == "dedicated_next_game" else "equal residual allocation",
        })

    players = []
    for record in summaries:
        pid = record["player_id"]
        card = by_id.get(pid)
        if card is None or card["position"] != record["position"]:
            raise ValueError(f"Missing or mismatched research card for {pid}")
        future = sorted(by_week[pid], key=lambda item: item["week"])
        if len(future) != int(record["ros_games"]):
            raise ValueError(f"ROS game mismatch for {pid}")
        if not future or future[0]["week"] != int(record["next_game_week"]):
            raise ValueError(f"Next-game schedule mismatch for {pid}")
        horizon_checks = (
            (future[:1], "next_game_fp"),
            (future[:4], "next_four_fp"),
            (future, "ros_fp"),
        )
        for span, field in horizon_checks:
            if abs(sum(row["fantasy_points"] for row in span) - floating(record[field])) > .0002:
                raise ValueError(f"Horizon totals did not reconcile for {pid}: {field}")
        for horizon, field in [("next_game", "next_game_fp"),
                               ("next_four", "next_four_fp"),
                               ("rest_of_season", "ros_fp")]:
            if abs(float(card[horizon]["fantasy_points"]) - floating(record[field])) > .0002:
                raise ValueError(f"Card and summary disagree for {pid}: {field}")
        player = {
            **card,
            "id": pid,
            "recent_ppg": floating(record["recent_six_fp_per_appearance"]),
            "gap": floating(record["model_minus_recent_fp"]),
            "next_game_rank": int(record["next_game_position_rank"]),
            "ros_rank": int(record["ros_position_rank"]),
            "next_four_ppg": float(card["next_four"]["fantasy_points"]) / max(1, len(card["next_four"]["weeks"])),
            "ros_ppg": float(card["rest_of_season"]["fantasy_points"]) / max(1, len(future)),
            "weekly": future,
        }
        players.append(player)

    if len({p["id"] for p in players}) != 251:
        raise ValueError("Duplicate player identifiers")

    return {
        "meta": {
            "name": "Sideline IQ NFL research v1 · 2026 Week 9 cutoff",
            "year": 2026, "last_observed_week": 9, "next_game_week": 10,
            "players": len(players), "weekly_rows": len(weekly), "positions": POSITIONS,
            "scoring": SCORING, "release_checks_passed": release["passed"],
            "deployment_status": "RESEARCH_PREVIEW",
            "model_validation": "Exact released horizon models not separately validated on untouched 2026 games",
            "uncertainty": "2025 historical absolute errors; not calibrated player-specific intervals",
            "availability": "Conditional on a player appearing; no roster, snap or injury adjustment",
            "weeks_after_next": "Equal allocation of aggregate forecast residual; not opponent-specific",
            "ability": "Production-versus-model gap is descriptive, not causal talent or independent ability",
            "data_source": "NFL 251-player Week-9 research release (local snapshot)",
        },
        "players": players,
        "metrics": {
            "historical_stat_effectiveness": effectiveness,
            "feature_ablation": ablation,
            "historical_next_game_stat_effectiveness": next_game_metrics,
            "note": "2025 historical experiments; differences are predictive associations, not causal skill attribution.",
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-zip", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=BASE_DIR / "data" / "research-v1.json")
    args = parser.parse_args()
    payload = build(args.source_zip)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {args.output}: {len(payload['players'])} players, {payload['meta']['weekly_rows']} future player-games")


if __name__ == "__main__":
    main()
