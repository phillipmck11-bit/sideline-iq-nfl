"""Join existing nflverse NGS downloads to a validated player-week snapshot.

Offline only; no routes, name matching, network, or paid execution.
"""
import argparse, csv, gzip, io, json, math
from pathlib import Path

CATEGORIES = ("passing", "rushing", "receiving")
IDENTITY = {"season_type", "game_type", "player_display_name", "player_position",
            "team_abbr", "player_gsis_id", "player_first_name", "player_last_name",
            "player_short_name", "season", "week", "game_id"}

def read_rows(path):
    data = path.read_bytes()
    if data.startswith(b"\x1f\x8b"):
        data = gzip.decompress(data)
    reader = csv.DictReader(io.StringIO(data.decode("utf-8-sig")))
    header = reader.fieldnames or []
    if not {"season_type", "player_gsis_id", "season", "week"}.issubset(header):
        raise ValueError("Missing NGS identity columns")
    if len(header) != len(set(header)):
        raise ValueError("Duplicate NGS header")
    rows = list(reader)
    if any(None in row or any(v is None for v in row.values()) for row in rows):
        raise ValueError("Malformed NGS CSV row")
    return rows

def numeric(v):
    try:
        n = float(v)
        return n if math.isfinite(n) else None
    except (ValueError, TypeError):
        return None

def join_ngs(payload, category, source_rows):
    if category not in CATEGORIES:
        raise ValueError("Invalid NGS category")
    year = payload["season"]
    base = payload["rows"]
    if payload.get("row_count") != len(base):
        raise ValueError("Base count mismatch")
    index = {}
    for r in base:
        key = (r["player_id"], r["week"])
        if not key[0] or key in index or r["season"] != year or not isinstance(key[1], int) or not 1 <= key[1] <= 18:
            raise ValueError("Invalid or duplicate base identity")
        index[key] = r
    seen = set()
    matched = unmatched = missing_id = 0
    cols = set()
    pending = []
    for raw in source_rows:
        if numeric(raw.get("season")) != year or raw.get("season_type") != "REG":
            continue
        week = numeric(raw.get("week"))
        if week == 0:  # NGS season aggregate, never mix with weekly rows
            continue
        if week is None or not week.is_integer() or not 1 <= week <= 18:
            raise ValueError("Invalid NGS regular-season week")
        pid = raw.get("player_gsis_id")
        if not pid or pid.strip() in {"", "NA", "null"}:
            missing_id += 1
            continue
        key = (pid, int(week))
        if key in seen:
            raise ValueError(f"Duplicate NGS {category} identity: {key}")
        seen.add(key)
        values = {f"ngs_{category}_{k}": numeric(v) for k, v in raw.items() if k not in IDENTITY}
        cols.update(values)
        if key not in index:
            unmatched += 1
            continue
        pending.append((index[key], values))
        matched += 1
    if not matched:
        raise ValueError(f"No matching NGS {category} data for {year}")
    for r in base:
        if any(k.startswith(f"ngs_{category}_") for k in r):
            raise ValueError(f"Category already joined: {category}")
    for r in base:
        r.update({k: None for k in cols})
    for r, values in pending:
        r.update(values)
    return {"matched": matched, "unmatched": unmatched, "missing_id": missing_id,
            "base_rows": len(base), "source_rows_with_id": len(seen), "metrics": sorted(cols)}

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--base", required=True, type=Path)
    p.add_argument("--out", required=True, type=Path)
    for c in CATEGORIES:
        p.add_argument("--" + c, type=Path)
    args = p.parse_args()
    payload = json.loads(args.base.read_text(encoding="utf-8"))
    reports = {}
    for c in CATEGORIES:
        path = getattr(args, c)
        if path:
            reports[c] = join_ngs(payload, c, read_rows(path))
    if not reports:
        p.error("At least one category file is required")
    payload["ngs_coverage"] = reports
    payload["ngs_source"] = "https://github.com/nflverse/nflverse-data/releases/tag/nextgen_stats"
    payload["ngs_attribution"] = "NFL Next Gen Stats via nflverse; CC BY 4.0 per nflverse data license; joined and filtered by Sideline IQ"
    args.out.parent.mkdir(parents=True, exist_ok=True)
    temp = args.out.with_suffix(".tmp")
    temp.write_text(json.dumps(payload, allow_nan=False, separators=(",", ":")), encoding="utf-8")
    temp.replace(args.out)
    print(json.dumps(reports, indent=2))
if __name__ == "__main__":
    main()
