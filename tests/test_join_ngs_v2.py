import unittest
from scripts.join_ngs_v2 import join_ngs

def base():
    return {"season":2026,"row_count":2,"rows":[
        {"player_id":"00-1","season":2026,"week":1},
        {"player_id":"00-2","season":2026,"week":1}]}

def ngs(**changes):
    return dict({"player_gsis_id":"00-1","season":"2026","season_type":"REG","week":"1","avg_separation":"3.2","avg_cushion":"NA"},**changes)

class NgsJoinTests(unittest.TestCase):
    def test_left_join_and_nulls(self):
        p=base()
        report=join_ngs(p,"receiving",[ngs(),ngs(player_gsis_id="00-3"),ngs(week="0"),ngs(season="2025")])
        self.assertEqual(report["matched"],1)
        self.assertEqual(report["unmatched"],1)
        self.assertEqual(p["rows"][0]["ngs_receiving_avg_separation"],3.2)
        self.assertIsNone(p["rows"][0]["ngs_receiving_avg_cushion"])
        self.assertIsNone(p["rows"][1]["ngs_receiving_avg_separation"])
    def test_duplicate_rejected(self):
        p=base()
        with self.assertRaises(ValueError): join_ngs(p,"receiving",[ngs(),ngs()])
        self.assertNotIn("ngs_receiving_avg_separation",p["rows"][0])
    def test_no_coverage_rejected(self):
        with self.assertRaises(ValueError): join_ngs(base(),"receiving",[ngs(season="2025")])
    def test_invalid_week_rejected(self):
        with self.assertRaises(ValueError): join_ngs(base(),"receiving",[ngs(week="19")])
    def test_missing_id_reported(self):
        p=base()
        report=join_ngs(p,"receiving",[ngs(),ngs(player_gsis_id="NA")])
        self.assertEqual(report["missing_id"],1)
if __name__=="__main__":
    unittest.main()
