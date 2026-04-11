"""
Step 3 — Aggregate batting and bowling stats per player per season.
"""
import os
import sys
import pandas as pd
import numpy as np

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

# ── Import column map ──────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from col_map import COL_MAP

# ── Load raw data ──────────────────────────────────────────────
print("Loading raw CSV …")
df = pd.read_csv(RAW_CSV, low_memory=False)
print(f"Loaded {len(df):,} deliveries")

# ── Normalize season column ────────────────────────────────────
# Correctly maps IPL season strings to 4-digit years.
# "2020/21" -> 2020 (The COVID-split season)
# "2007/08" -> 2008
# "2009/10" -> 2010
def normalize_season(val):
    s = str(val).strip()
    if "/" in s:
        parts = s.split("/")
        first_year_str = parts[0][:4]
        # Exception for 2020
        if first_year_str == "2020":
            return 2020
        # General pattern for others: usage of second year as season year
        suffix = parts[1].strip()
        if len(suffix) == 2:
            return int(first_year_str[:2] + suffix)
        return int(suffix[:4])
    return int(s[:4])

df[COL_MAP["season"]] = df[COL_MAP["season"]].apply(normalize_season)
print(f"Normalized seasons: {sorted(df[COL_MAP['season']].unique())}")

# Convenience aliases
C_BATTER    = COL_MAP["batter"]
C_BOWLER    = COL_MAP["bowler"]
C_BAT_RUNS  = COL_MAP["batsman_runs"]
C_TOTAL_RUNS = COL_MAP["total_runs"]
C_IS_WICKET = COL_MAP["is_wicket"]
C_DISMISS   = COL_MAP["dismissal_kind"]
C_SEASON    = COL_MAP["season"]
C_MATCH_ID  = COL_MAP["match_id"]
C_INNINGS   = COL_MAP["innings"]
C_EXTRAS    = COL_MAP["extras_kind"]

# ── Drop duplicate deliveries before aggregation ───────────────
# Prefer [match_id, inning/innings, over, ball]. If over is missing but ball is
# decimal notation (e.g. 12.3), derive over/ball from that field.
over_col = next((c for c in ["over", "ball_over", "over_number"] if c in df.columns), None)
ball_col = next((c for c in ["ball", "ball_number", "delivery", "delivery_number"] if c in df.columns), None)
inning_col = next((c for c in ["inning", "innings"] if c in df.columns), C_INNINGS)

if over_col is None and ball_col in df.columns:
    ball_numeric = pd.to_numeric(df[ball_col], errors="coerce")
    df["_over"] = np.floor(ball_numeric).astype("Int64")
    df["_ball_in_over"] = ((ball_numeric * 10).round().astype("Int64") % 10)
    over_col = "_over"
    ball_col = "_ball_in_over"

candidate_keys = [C_MATCH_ID, inning_col, over_col, ball_col]
dedupe_cols = [c for c in candidate_keys if c is not None and c in df.columns]
if len(dedupe_cols) >= 3:
    before = len(df)
    df = df.drop_duplicates(subset=dedupe_cols)
    removed = before - len(df)
    print(f"Removed {removed:,} duplicate deliveries using {dedupe_cols}")
else:
    print("Warning: Could not identify enough delivery key columns; skipping duplicate-delivery drop.")

# ── Handle is_wicket column ────────────────────────────────────
# If is_wicket is a string column (like wicket_type), convert to 0/1 flag
is_wicket_flag = COL_MAP.get("is_wicket_flag", False)
if not is_wicket_flag and C_IS_WICKET:
    # wicket_type column: non-null means a wicket happened
    df["_is_wicket"] = df[C_IS_WICKET].notna().astype(int)
    C_IS_WICKET_USE = "_is_wicket"
else:
    C_IS_WICKET_USE = C_IS_WICKET

# ── Handle extras – build individual flag columns if needed ────
# The dataset has individual columns: wides, noballs, byes, legbyes
has_wides    = "wides" in [c.lower() for c in df.columns]
has_noballs  = "noballs" in [c.lower() for c in df.columns]
has_byes     = "byes" in [c.lower() for c in df.columns]
has_legbyes  = "legbyes" in [c.lower() for c in df.columns]

# Map actual column names (case-sensitive)
col_lower_map = {c.lower(): c for c in df.columns}

# Create a synthetic extras_kind column for uniform handling
if C_EXTRAS is None:
    # Build from individual columns
    def classify_extra(row):
        if has_wides and pd.notna(row.get(col_lower_map.get("wides"))) and row.get(col_lower_map.get("wides")) > 0:
            return "wides"
        if has_noballs and pd.notna(row.get(col_lower_map.get("noballs"))) and row.get(col_lower_map.get("noballs")) > 0:
            return "noballs"
        if has_byes and pd.notna(row.get(col_lower_map.get("byes"))) and row.get(col_lower_map.get("byes")) > 0:
            return "byes"
        if has_legbyes and pd.notna(row.get(col_lower_map.get("legbyes"))) and row.get(col_lower_map.get("legbyes")) > 0:
            return "legbyes"
        return None

    print("Building synthetic extras_kind column from individual extras columns …")
    # Vectorized approach for performance
    wides_col   = col_lower_map.get("wides")
    noballs_col = col_lower_map.get("noballs")
    byes_col    = col_lower_map.get("byes")
    legbyes_col = col_lower_map.get("legbyes")

    extras_kind = pd.Series(np.nan, index=df.index, dtype=object)
    if legbyes_col:
        extras_kind = extras_kind.where(~((df[legbyes_col].fillna(0) > 0)), "legbyes")
    if byes_col:
        extras_kind = extras_kind.where(~((df[byes_col].fillna(0) > 0)), "byes")
    if noballs_col:
        extras_kind = extras_kind.where(~((df[noballs_col].fillna(0) > 0)), "noballs")
    if wides_col:
        extras_kind = extras_kind.where(~((df[wides_col].fillna(0) > 0)), "wides")

    df["extras_kind"] = extras_kind
    C_EXTRAS_USE = "extras_kind"
else:
    C_EXTRAS_USE = C_EXTRAS

# ── Handle total_runs ──────────────────────────────────────────
# If total_runs is actually "extras", compute it
extras_col_actual = col_lower_map.get("extras")
if C_TOTAL_RUNS == "extras" or C_TOTAL_RUNS is None:
    if extras_col_actual and C_BAT_RUNS:
        df["_total_runs"] = df[C_BAT_RUNS].fillna(0) + df[extras_col_actual].fillna(0)
        C_TOTAL_RUNS_USE = "_total_runs"
    else:
        C_TOTAL_RUNS_USE = C_BAT_RUNS
else:
    C_TOTAL_RUNS_USE = C_TOTAL_RUNS

# ================================================================
#  BATTING AGGREGATES — group by [season, batter]
# ================================================================
print("\n--- Batting Aggregation ---")

bat_df = df.copy()

# Drop rows where batter is null or empty
bat_df = bat_df[bat_df[C_BATTER].notna() & (bat_df[C_BATTER].astype(str).str.strip() != "")]

# For balls_faced: exclude wides
bat_legal = bat_df[bat_df[C_EXTRAS_USE] != "wides"] if C_EXTRAS_USE else bat_df

# Group for runs, fours, sixes
bat_runs = bat_df.groupby([C_SEASON, C_BATTER]).agg(
    total_runs  = (C_BAT_RUNS, "sum"),
    fours       = (C_BAT_RUNS, lambda x: (x == 4).sum()),
    sixes       = (C_BAT_RUNS, lambda x: (x == 6).sum()),
).reset_index()

# Balls faced (excluding wides)
balls_faced = bat_legal.groupby([C_SEASON, C_BATTER]).size().reset_index(name="balls_faced")

# Matches — distinct match_ids
matches = bat_df.groupby([C_SEASON, C_BATTER])[C_MATCH_ID].nunique().reset_index(name="matches")

# Innings
if C_INNINGS:
    # Count distinct (match_id, innings) pairs as innings count.
    innings_df = (
        bat_df[[C_SEASON, C_BATTER, C_MATCH_ID, C_INNINGS]]
        .drop_duplicates()
        .groupby([C_SEASON, C_BATTER])
        .size()
        .reset_index(name="innings")
    )
else:
    innings_df = bat_runs[[C_SEASON, C_BATTER]].copy()
    innings_df["innings"] = np.nan

# Team — most frequent batting_team per player-season
if "batting_team" in bat_df.columns:
    bat_team = (
        bat_df.groupby([C_SEASON, C_BATTER])["batting_team"]
        .agg(lambda x: x.mode().iloc[0] if len(x.mode()) > 0 else x.iloc[0])
        .reset_index(name="team")
    )
else:
    bat_team = bat_runs[[C_SEASON, C_BATTER]].copy()
    bat_team["team"] = "Unknown"

# Dismissals (Outs)
# Note: we filter for where the player_dismissed column is not null.
# This captures all outs including run outs.
outs = df[df["player_dismissed"].notna()].groupby([C_SEASON, "player_dismissed"]).size().reset_index(name="outs")
outs = outs.rename(columns={"player_dismissed": C_BATTER})

# Merge all batting components
batting = bat_runs.merge(balls_faced, on=[C_SEASON, C_BATTER], how="left")
batting = batting.merge(matches,      on=[C_SEASON, C_BATTER], how="left")
batting = batting.merge(innings_df,   on=[C_SEASON, C_BATTER], how="left")
batting = batting.merge(bat_team,     on=[C_SEASON, C_BATTER], how="left")
batting = batting.merge(outs,         on=[C_SEASON, C_BATTER], how="left")

# Fill missing outs with 0 (meaning the player was never dismissed)
batting["outs"] = batting["outs"].fillna(0).astype(int)

# Strike rate
batting["balls_faced"] = batting["balls_faced"].fillna(0).astype(int)
batting["strike_rate"] = np.where(
    batting["balls_faced"] > 0,
    (batting["total_runs"] / batting["balls_faced"] * 100).round(2),
    0.0
)

# Batting Average (Standard definition: Runs / Outs)
# If 0 outs, average equals total_runs (simplified convention for "infinity")
batting["batting_average"] = np.where(
    batting["outs"] > 0,
    (batting["total_runs"] / batting["outs"]).round(2),
    batting["total_runs"].astype(float)
)

# Rename batter column to "player" for consistency
batting = batting.rename(columns={C_BATTER: "player", C_SEASON: "season"})

TEAM_NAME_MAP = {
    "Kings XI Punjab": "Punjab Kings",
    "Delhi Daredevils": "Delhi Capitals",
    "Royal Challengers Bangalore": "Royal Challengers Bengaluru",
    "Rising Pune Supergiants": "Rising Pune Supergiant",
    "Deccan Chargers": "Sunrisers Hyderabad"
}

if "team" in batting.columns:
    batting["team"] = batting["team"].replace(TEAM_NAME_MAP)

def warn_unrealistic_batting_totals(batting_df):
    high_totals = batting_df[batting_df["total_runs"] > 1000].sort_values(["season", "total_runs"], ascending=[True, False])
    if high_totals.empty:
        return
    print("\nWARNING: Found player-season batting totals > 1000 (possible data duplication issue):")
    for _, row in high_totals.iterrows():
        print(f" - season {row['season']}: {row['player']} -> {int(row['total_runs'])} runs")

warn_unrealistic_batting_totals(batting)

print(f"Batting aggregate shape: {batting.shape}")
print(batting.head(5).to_string())

batting.to_csv(BATTING_CSV, index=False)

# ================================================================
#  BOWLING AGGREGATES — group by [season, bowler]
# ================================================================
print("\n--- Bowling Aggregation ---")

bowl_df = df.copy()
bowl_df = bowl_df[bowl_df[C_BOWLER].notna() & (bowl_df[C_BOWLER].astype(str).str.strip() != "")]

# Wickets: sum of is_wicket, exclude run outs if dismissal_kind exists
if C_DISMISS:
    wicket_df = bowl_df[bowl_df[C_DISMISS] != "run out"].copy() if C_DISMISS else bowl_df.copy()
else:
    wicket_df = bowl_df.copy()

wickets = wicket_df.groupby([C_SEASON, C_BOWLER])[C_IS_WICKET_USE].sum().reset_index(name="wickets")

# Runs conceded: sum of total_runs, exclude byes and legbyes
conceded_df = bowl_df.copy()
if C_EXTRAS_USE:
    conceded_df = conceded_df[~conceded_df[C_EXTRAS_USE].isin(["byes", "legbyes", "b", "lb"])]
runs_conceded = conceded_df.groupby([C_SEASON, C_BOWLER])[C_TOTAL_RUNS_USE].sum().reset_index(name="runs_conceded")

# Balls bowled: exclude wides and no-balls
legal_bowl = bowl_df.copy()
if C_EXTRAS_USE:
    legal_bowl = legal_bowl[~legal_bowl[C_EXTRAS_USE].isin(["wides", "noballs", "wide", "noball"])]
balls_bowled = legal_bowl.groupby([C_SEASON, C_BOWLER]).size().reset_index(name="balls_bowled")

# Dot balls: legal deliveries with 0 runs conceded
dot_balls = legal_bowl[legal_bowl[C_TOTAL_RUNS_USE] == 0].groupby([C_SEASON, C_BOWLER]).size().reset_index(name="dot_balls")

# Matches bowled
matches_bowled = bowl_df.groupby([C_SEASON, C_BOWLER])[C_MATCH_ID].nunique().reset_index(name="matches_bowled")

# Team — most frequent bowling_team per player-season
# Note: bowling_team is the team the bowler plays for
if "bowling_team" in bowl_df.columns:
    bowl_team = (
        bowl_df.groupby([C_SEASON, C_BOWLER])["bowling_team"]
        .agg(lambda x: x.mode().iloc[0] if len(x.mode()) > 0 else x.iloc[0])
        .reset_index(name="team")
    )
else:
    bowl_team = wickets[[C_SEASON, C_BOWLER]].copy()
    bowl_team["team"] = "Unknown"

# Merge all bowling components
bowling = wickets.merge(runs_conceded, on=[C_SEASON, C_BOWLER], how="left")
bowling = bowling.merge(balls_bowled,  on=[C_SEASON, C_BOWLER], how="left")
bowling = bowling.merge(dot_balls,     on=[C_SEASON, C_BOWLER], how="left")
bowling = bowling.merge(matches_bowled, on=[C_SEASON, C_BOWLER], how="left")
bowling = bowling.merge(bowl_team,     on=[C_SEASON, C_BOWLER], how="left")

bowling["dot_balls"] = bowling["dot_balls"].fillna(0).astype(int)

bowling["economy"] = np.where(
    bowling["balls_bowled"] > 0,
    (bowling["runs_conceded"] / bowling["balls_bowled"] * 6).round(2),
    0.0
)

# Bowling Average (Runs / Wickets)
bowling["bowling_average"] = np.where(
    bowling["wickets"] > 0,
    (bowling["runs_conceded"] / bowling["wickets"]).round(2),
    bowling["runs_conceded"].astype(float) # Fallback for no wickets
)

# Bowling Strike Rate (Balls / Wickets)
bowling["bowling_strike_rate"] = np.where(
    bowling["wickets"] > 0,
    (bowling["balls_bowled"] / bowling["wickets"]).round(2),
    bowling["balls_bowled"].astype(float) # Fallback for no wickets
)

bowling = bowling.rename(columns={C_BOWLER: "player", C_SEASON: "season"})

if "team" in bowling.columns:
    bowling["team"] = bowling["team"].replace(TEAM_NAME_MAP)

print(f"\nBowling aggregate shape: {bowling.shape}")
print(bowling.head(5).to_string())

bowling.to_csv(BOWLING_CSV, index=False)

print(f"\nStep 3 complete — batting_agg.csv and bowling_agg.csv saved.")
