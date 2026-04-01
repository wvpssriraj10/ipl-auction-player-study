"""
Step 2 — Inspect the raw ball-by-ball CSV and auto-detect column mappings.
"""
import os
import pandas as pd

# ── Path constants ──────────────────────────────────────────────
BASE_DIR      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR       = os.path.join(BASE_DIR, "data", "raw")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
OUTPUT_DIR    = os.path.join(BASE_DIR, "data", "output")
REPORTS_DIR   = os.path.join(BASE_DIR, "reports")

RAW_CSV       = os.path.join(RAW_DIR,       "ipl_matches.csv")
AWARDS_CSV    = os.path.join(PROCESSED_DIR, "ipl_awards_prices.csv")
BATTING_CSV   = os.path.join(PROCESSED_DIR, "batting_agg.csv")
BOWLING_CSV   = os.path.join(PROCESSED_DIR, "bowling_agg.csv")
VALUE_CSV     = os.path.join(PROCESSED_DIR, "player_value_scores.csv")
REPORT_TXT    = os.path.join(REPORTS_DIR,   "summary_report.txt")

CHART1        = os.path.join(OUTPUT_DIR, "chart1_price_vs_performance.png")
CHART2        = os.path.join(OUTPUT_DIR, "chart2_hit_rate_by_season.png")
CHART3        = os.path.join(OUTPUT_DIR, "chart3_value_leaderboard.png")
CHART4        = os.path.join(OUTPUT_DIR, "chart4_era_analysis.png")

for d in [RAW_DIR, PROCESSED_DIR, OUTPUT_DIR, REPORTS_DIR]:
    os.makedirs(d, exist_ok=True)

# ── Load data ───────────────────────────────────────────────────
print("Loading raw CSV …")
df = pd.read_csv(RAW_CSV, low_memory=False)

print(f"\n{'='*60}")
print(f"Shape: {df.shape[0]} rows × {df.shape[1]} columns")
print(f"{'='*60}")

print(f"\nColumn names ({len(df.columns)}):")
for i, c in enumerate(df.columns):
    print(f"  {i+1:>2}. {c}")

print(f"\n{'='*60}")
print("First 3 rows:")
print(f"{'='*60}")
print(df.head(3).to_string())

# ── Unique seasons ──────────────────────────────────────────────
season_candidates = [c for c in df.columns if c.lower() in ("season", "year", "ipl_year")]
season_col = season_candidates[0] if season_candidates else None
if season_col:
    seasons = sorted(df[season_col].dropna().unique())
    print(f"\nUnique seasons ({len(seasons)}): {seasons}")

# ── Null counts for key columns ────────────────────────────────
key_cols = [c for c in df.columns if c.lower() in
            ("batter", "batsman", "striker", "bowler", "bowling_player",
             "batsman_runs", "batter_runs", "runs_off_bat",
             "is_wicket", "wicket", "wicket_type",
             "season", "year", "match_id", "id", "extras",
             "wides", "noballs", "byes", "legbyes")]
print(f"\nNull counts for key columns:")
for c in key_cols:
    print(f"  {c:25s} → {df[c].isnull().sum():>8,}")

# ── Auto-detect column mapping ──────────────────────────────────
def find_col(df, candidates, label):
    """Return the first column whose lowercase name matches a candidate."""
    cols_lower = {c.lower(): c for c in df.columns}
    for cand in candidates:
        if cand.lower() in cols_lower:
            found = cols_lower[cand.lower()]
            print(f"  {label:20s} → {found}")
            return found
    print(f"  {label:20s} → None  (not found)")
    return None

print(f"\n{'='*60}")
print("Auto-detected column mapping:")
print(f"{'='*60}")

col_batter       = find_col(df, ["batter", "batsman", "striker"],                    "batter")
col_bowler       = find_col(df, ["bowler", "bowling_player"],                         "bowler")
col_batsman_runs = find_col(df, ["batsman_runs", "batter_runs", "runs_off_bat"],      "batsman_runs")
col_total_runs   = find_col(df, ["total_runs", "runs_off_bat"],                       "total_runs")
col_is_wicket    = find_col(df, ["is_wicket", "wicket", "wicket_type"],               "is_wicket")
col_dismissal    = find_col(df, ["dismissal_kind", "player_dismissed_kind",
                                  "wicket_type"],                                      "dismissal_kind")
col_season       = find_col(df, ["season", "year", "ipl_year"],                       "season")
col_match_id     = find_col(df, ["match_id", "id", "game_id"],                        "match_id")
col_innings      = find_col(df, ["inning", "innings", "innings_id"],                   "innings")
col_extras_kind  = find_col(df, ["extras_kind", "extra_type", "extras_type"],          "extras_kind")

# ── Handle special cases ────────────────────────────────────────
# If is_wicket column is actually "wicket_type" (string not flag), note it
is_wicket_is_flag = False
if col_is_wicket:
    sample = df[col_is_wicket].dropna().head(20)
    if sample.dtype in ("int64", "float64") or set(sample.unique()).issubset({0, 1, 0.0, 1.0}):
        is_wicket_is_flag = True

# If total_runs was not found separately from batsman_runs, fall back
if col_total_runs == col_batsman_runs:
    # Check for an "extras" column to derive total_runs = batsman_runs + extras
    if "extras" in [c.lower() for c in df.columns]:
        col_total_runs = "extras"  # we will handle this in downstream scripts
        print(f"\n  NOTE: total_runs not found as a separate column.")
        print(f"        Will compute total_runs = {col_batsman_runs} + extras in downstream steps.")

# ── Write col_map.py ────────────────────────────────────────────
col_map_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "col_map.py")

col_map_content = f'''# auto-generated by step2_inspect.py — do not edit manually
COL_MAP = {{
    "batter":          {repr(col_batter)},
    "bowler":          {repr(col_bowler)},
    "batsman_runs":    {repr(col_batsman_runs)},
    "total_runs":      {repr(col_total_runs)},
    "is_wicket":       {repr(col_is_wicket)},
    "is_wicket_flag":  {repr(is_wicket_is_flag)},
    "dismissal_kind":  {repr(col_dismissal)},
    "season":          {repr(col_season)},
    "match_id":        {repr(col_match_id)},
    "innings":         {repr(col_innings)},
    "extras_kind":     {repr(col_extras_kind)},
}}
'''

with open(col_map_path, "w", encoding="utf-8") as f:
    f.write(col_map_content)

print(f"\n{'='*60}")
print(f"Column map written to: {col_map_path}")
print(col_map_content)
print(f"Step 2 complete — col_map.py saved to /scripts/")
