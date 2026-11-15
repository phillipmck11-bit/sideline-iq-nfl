"""Deterministic structural checks for the static 251-player research export."""
from __future__ import annotations

import json
import math
import unittest
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "data" / "research-v1.json"
WEIGHTS = {"passing_yards": .05, "passing_tds": 4, "interceptions": -2,
           "rushing_yards": .1, "rushing_tds": 6,
           "receiving_yards": .1, "receiving_tds": 6}


def score(stats: dict, position: str) -> float:
    return sum(v * float(stats.get(k, 0)) for k, v in WEIGHTS.items()) + float(stats.get("catches", 0)) * (
        1.5 if position == "TE" else 0 if position == "QB" else 1)


class ResearchPayloadTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.payload = json.loads(PATH.read_text(encoding="utf-8"))
        cls.players = cls.payload["players"]

    def test_exact_251_counts(self):
        self.assertEqual(self.payload["meta"]["players"], 251)
        self.assertEqual(len(self.players), 251)
        self.assertEqual(Counter(p["position"] for p in self.players), {"QB": 40, "RB": 75, "WR": 100, "TE": 36})
        self.assertEqual(len({p["id"] for p in self.players}), 251)

    def test_no_week10_observation(self):
        self.assertEqual(self.payload["meta"]["last_observed_week"], 9)
        self.assertEqual(self.payload["meta"]["deployment_status"], "RESEARCH_PREVIEW")
        self.assertTrue(all(10 <= row["week"] <= 18 for p in self.players for row in p["weekly"]))

    def test_future_week_schedule(self):
        self.assertEqual(sum(len(p["weekly"]) for p in self.players), 2125)
        for p in self.players:
            weeks = [row["week"] for row in p["weekly"]]
            self.assertEqual(weeks, sorted(set(weeks)))
            self.assertEqual(weeks[0], p["next_game"]["week"])
            self.assertEqual(weeks[:4], p["next_four"]["weeks"])
            self.assertEqual(weeks, p["rest_of_season"]["weeks"])

    def test_all_fantasy_points_reconcile(self):
        for p in self.players:
            for item in p["weekly"]:
                self.assertTrue(all(math.isfinite(v) and v >= 0 for v in item["stats"].values()))
                self.assertAlmostEqual(item["fantasy_points"], score(item["stats"], p["position"]), delta=.0002)
            for horizon, series in [("next_game", p["weekly"][:1]),
                                    ("next_four", p["weekly"][:4]),
                                    ("rest_of_season", p["weekly"])]:
                value = p[horizon]["fantasy_points"]
                # Research cards display 4-decimal stat components; the full-
                # precision weekly rows are the authoritative scoring ledger.
                self.assertAlmostEqual(value, score(p[horizon]["stats"], p["position"]), delta=.002)
                self.assertAlmostEqual(value, sum(w["fantasy_points"] for w in series), delta=.0002)

    def test_experimental_labels_present(self):
        meta = self.payload["meta"]
        self.assertIn("not calibrated", meta["uncertainty"])
        self.assertIn("not separately validated", meta["model_validation"])
        self.assertIn("Conditional", meta["availability"])
        self.assertIn("not causal", meta["ability"])


if __name__ == "__main__":
    unittest.main()
