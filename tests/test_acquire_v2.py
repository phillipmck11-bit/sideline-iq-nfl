import unittest
from scripts.acquire_v2 import normalize, number, source

def row(**changes):
    return dict({"player_id":"00-1234567","position":"WR","season_type":"REG","season":"2026","week":"1","receiving_yards":"0","targets":"NA"}, **changes)

class IngestionTests(unittest.TestCase):
    def test_missing_is_not_zero(self):
        a = normalize([row()], 2026)[0]
        self.assertEqual(a["receiving_yards"], 0)
        self.assertIsNone(a["targets"])
        self.assertIsNone(number("NaN"))
    def test_duplicate_rejected(self):
        with self.assertRaises(ValueError):
            normalize([row(), row()], 2026)
    def test_filters(self):
        self.assertEqual(len(normalize([row(),row(position="CB"),row(season_type="POST")],2026)),1)
    def test_invalid_identity(self):
        with self.assertRaises(ValueError):
            normalize([row(player_id="")],2026)
    def test_current_release(self):
        self.assertTrue(source(2026).endswith("stats_player/stats_player_week_2026.csv.gz"))
if __name__ == "__main__":
    unittest.main()
