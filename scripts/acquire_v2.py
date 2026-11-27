"""Local-only acquisition of nflverse player-week data. No paid services."""
import argparse, csv, gzip, io, json, math, urllib.request
from pathlib import Path
from datetime import datetime, timezone

BASE = "https://github.com/nflverse/nflverse-data/releases/download/"
POSITIONS = {"QB", "RB", "WR", "TE"}
IDENTITY = {"player_id","player_name","player_display_name","position","position_group","team","recent_team","opponent_team","season","week","season_type","headshot_url"}
def source(year):
    return BASE + f"stats_player/stats_player_week_{year}.csv.gz"

def download(url):
    with urllib.request.urlopen(url, timeout=90) as response:
        return list(csv.DictReader(io.StringIO(gzip.decompress(response.read()).decode("utf-8-sig"))))

def number(value):
    try:
        n = float(value)
        return n if math.isfinite(n) else None
    except (ValueError, TypeError):
        return None

def normalize(rows, year):
    result, seen = [], set()
    for raw in rows:
        if raw.get("position") not in POSITIONS or raw.get("season_type") != "REG":
            continue
        pid = raw.get("player_id")
        week = number(raw.get("week"))
        if not pid or week is None or not week.is_integer() or not 1 <= week <= 18 or number(raw.get("season")) != year:
            raise ValueError("Invalid player-week identity")
        key = (pid, int(week))
        if key in seen:
            raise ValueError(f"Duplicate player-week: {key}")
        seen.add(key)
        row = {k: raw.get(k) or None for k in IDENTITY if k in raw}
        row.update(season=year, week=int(week))
        row.update({k: number(v) for k,v in raw.items() if k not in IDENTITY})
        result.append(row)
    if not result:
        raise ValueError(f"No regular-season offensive player rows for {year}")
    return sorted(result, key=lambda r:(r["week"],r["player_id"]))

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--years", nargs="+", type=int, default=[2026])
    p.add_argument("--out", type=Path, default=Path("local-data/v2"))
    args = p.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    for year in args.years:
        rows = normalize(download(source(year)), year)
        payload = {"source":source(year),"retrieved_at":datetime.now(timezone.utc).isoformat(),"season":year,"latest_week":max(r["week"] for r in rows),"row_count":len(rows),"rows":rows}
        target = args.out / f"player-week-{year}.json"
        temp = target.with_suffix(".tmp")
        temp.write_text(json.dumps(payload, allow_nan=False, separators=(",",":")), encoding="utf-8")
        temp.replace(target)
        print(year, len(rows), payload["latest_week"])
if __name__ == "__main__":
    main()
