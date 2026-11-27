"""Audit a static snapshot before publication; no network or dependencies."""
import argparse, collections, json, math, re
from pathlib import Path

def audit(p):
    rows=p["rows"]
    if p["season"] != 2026 or not rows or p["row_count"] != len(rows):
        raise ValueError("Invalid 2026 snapshot count")
    seen=set()
    weeks=collections.Counter()
    positions=collections.Counter()
    coverage=collections.Counter()
    players=set()
    for row in rows:
        pid=row.get("player_id")
        week=row.get("week")
        pos=row.get("position")
        if not isinstance(pid,str) or not re.fullmatch(r"00-\d{7}",pid):
            raise ValueError("Invalid GSIS ID")
        if row.get("season")!=2026 or type(week)!=int or not 1<=week<=18 or pos not in {"QB","RB","WR","TE"}:
            raise ValueError("Invalid player-week identity")
        if (pid,week) in seen:
            raise ValueError("Duplicate player-week")
        seen.add((pid,week))
        players.add(pid)
        weeks[week]+=1
        positions[pos]+=1
        for k,v in row.items():
            if type(v) in (int,float):
                if not math.isfinite(v):
                    raise ValueError("Nonfinite metric")
                coverage[k]+=1
    if set(positions)!={"QB","RB","WR","TE"}:
        raise ValueError("Missing position")
    if set(weeks)!=set(range(1,max(weeks)+1)):
        raise ValueError("Missing week")
    if p.get("latest_week",max(weeks))!=max(weeks):
        raise ValueError("Latest week mismatch")
    return {"rows":len(rows),"players":len(players),"weeks":dict(sorted(weeks.items())),
            "positions":dict(positions),"numeric_coverage":dict(sorted(coverage.items())),
            "ngs_coverage":p.get("ngs_coverage",{}),
            "warning":"Structural audit only; compare source totals and confirm publication rights separately."}

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("snapshot",type=Path)
    args=parser.parse_args()
    print(json.dumps(audit(json.loads(args.snapshot.read_text(encoding="utf-8"))),indent=2))
