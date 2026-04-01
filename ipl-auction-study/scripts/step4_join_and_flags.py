"""
Step 4 — Join awards data with batting/bowling aggregates via smart name matching.

Name matching strategy:
  Award names are full names like "Gautam Gambhir"
  CSV names are initial-based like "G Gambhir"
  → Match on SURNAME first, then disambiguate using fuzzy scoring on full name.
"""
import os
import sys
import pandas as pd
import numpy as np
from fuzzywuzzy import fuzz

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

# ── Load data ──────────────────────────────────────────────────
awards  = pd.read_csv(AWARDS_CSV)
batting = pd.read_csv(BATTING_CSV)
bowling = pd.read_csv(BOWLING_CSV)

print(f"Awards:  {awards.shape}")
print(f"Batting: {batting.shape}")
print(f"Bowling: {bowling.shape}")

# ── Smart name matching ────────────────────────────────────────
def get_surname(name):
    """Extract surname (last word) from a name string."""
    parts = str(name).strip().split()
    return parts[-1].lower() if parts else ""

def smart_find(award_name, candidates):
    """
    Match an award-table name (e.g. 'Gautam Gambhir') to a CSV name
    (e.g. 'G Gambhir') from a list of candidates.

    Strategy:
      1. Exact match (case-insensitive)
      2. Surname match — filter candidates sharing the surname,
         then pick the one with highest fuzzy score
      3. Fallback to overall best fuzzy score with a low cutoff
    """
    if not candidates or pd.isna(award_name):
        return None, 0

    award_name = str(award_name).strip()
    award_lower = award_name.lower()

    # 1. Exact match
    for c in candidates:
        if str(c).strip().lower() == award_lower:
            return c, 100

    # 2. Surname-based matching
    award_surname = get_surname(award_name)
    surname_matches = [c for c in candidates if get_surname(c) == award_surname]

    if len(surname_matches) == 1:
        # Only one candidate shares the surname → high confidence match
        score = fuzz.token_sort_ratio(award_name, surname_matches[0])
        return surname_matches[0], max(score, 85)  # floor at 85 since surname matched

    if len(surname_matches) > 1:
        # Multiple candidates share surname → pick best fuzzy score
        best_name, best_score = None, 0
        for c in surname_matches:
            score = fuzz.token_sort_ratio(award_name, c)
            if score > best_score:
                best_name, best_score = c, score
        if best_name:
            return best_name, max(best_score, 80)

    # 3. Fallback: best fuzzy match across all candidates
    best_name, best_score = None, 0
    for c in candidates:
        score = fuzz.token_sort_ratio(award_name, c)
        if score > best_score:
            best_name, best_score = c, score
    if best_score >= 60:
        return best_name, best_score

    return None, 0


def smart_match_bool(name1, name2):
    """Check if two names refer to the same person using surname matching."""
    if pd.isna(name1) or pd.isna(name2):
        return False
    n1, n2 = str(name1).strip(), str(name2).strip()

    # Exact match
    if n1.lower() == n2.lower():
        return True

    # Surname must match
    if get_surname(n1) != get_surname(n2):
        return False

    # Surname matches → accept if fuzzy score >= 50 (very lenient since surname matched)
    return fuzz.token_sort_ratio(n1, n2) >= 50


# ── For each season, look up highest buy player stats ──────────
print(f"\n{'='*70}")
print("Matching highest_buy_player to batting/bowling aggregates:")
print(f"{'='*70}\n")

results = []

for _, row in awards.iterrows():
    season = row["season"]
    player = row["highest_buy_player"]

    # Get candidate names for this season
    bat_season = batting[batting["season"] == season]
    bowl_season = bowling[bowling["season"] == season]

    bat_names = bat_season["player"].dropna().unique().tolist()
    bowl_names = bowl_season["player"].dropna().unique().tolist()

    # Match in batting
    bat_match, bat_score = smart_find(player, bat_names)
    if bat_match:
        print(f"  MATCH (bat): '{player}' -> '{bat_match}' (score: {bat_score}) [season {season}]")
        bat_row = bat_season[bat_season["player"] == bat_match].iloc[0]
        buy_runs        = bat_row["total_runs"]
        buy_balls_faced = bat_row["balls_faced"]
        buy_sr          = bat_row["strike_rate"]
        buy_bat_matches = bat_row["matches"]
    else:
        print(f"  NO MATCH (bat): '{player}' [season {season}]")
        buy_runs = buy_balls_faced = buy_sr = buy_bat_matches = np.nan

    # Match in bowling
    bowl_match, bowl_score = smart_find(player, bowl_names)
    if bowl_match:
        print(f"  MATCH (bowl): '{player}' -> '{bowl_match}' (score: {bowl_score}) [season {season}]")
        bowl_row = bowl_season[bowl_season["player"] == bowl_match].iloc[0]
        buy_wickets      = bowl_row["wickets"]
        buy_balls_bowled = bowl_row["balls_bowled"]
        buy_economy      = bowl_row["economy"]
        buy_bowl_matches = bowl_row["matches_bowled"]
    else:
        print(f"  NO MATCH (bowl): '{player}' [season {season}]")
        buy_wickets = buy_balls_bowled = buy_economy = buy_bowl_matches = np.nan

    if bat_match is None and bowl_match is None:
        print(f"  WARNING: '{player}' NOT FOUND in either batting or bowling for season {season}")

    # Award comparisons using surname matching
    won_orange = smart_match_bool(player, row["orange_cap"])
    won_purple = smart_match_bool(player, row["purple_cap"])
    won_mvp    = smart_match_bool(player, row["mvp"])
    won_any    = won_orange or won_purple or won_mvp

    results.append({
        "season":              season,
        "highest_buy_player":  player,
        "highest_buy_price_cr": row["highest_buy_price_cr"],
        "highest_buy_team":    row["highest_buy_team"],
        "orange_cap":          row["orange_cap"],
        "purple_cap":          row["purple_cap"],
        "mvp":                 row["mvp"],
        "buy_runs":            buy_runs,
        "buy_balls_faced":     buy_balls_faced,
        "buy_sr":              buy_sr,
        "buy_wickets":         buy_wickets,
        "buy_balls_bowled":    buy_balls_bowled,
        "buy_economy":         buy_economy,
        "won_orange":          won_orange,
        "won_purple":          won_purple,
        "won_mvp":             won_mvp,
        "won_any":             won_any,
    })

# ── Build enriched awards table ────────────────────────────────
enriched = pd.DataFrame(results)

# Save enriched awards back (overwrite)
enriched.to_csv(AWARDS_CSV, index=False)

# ── Print results ──────────────────────────────────────────────
print(f"\n{'='*70}")
print("Enriched Awards Table:")
print(f"{'='*70}")
pd.set_option("display.max_columns", 30)
pd.set_option("display.width", 200)
print(enriched.to_string(index=False))

total_seasons = len(enriched)
won_count = int(enriched["won_any"].sum())
pct = (won_count / total_seasons * 100) if total_seasons > 0 else 0

print(f"\n{'='*70}")
print(f"Big buy won at least one award in {won_count} / {total_seasons} seasons ({pct:.1f}%)")
print(f"  Orange Cap: {int(enriched['won_orange'].sum())} | "
      f"Purple Cap: {int(enriched['won_purple'].sum())} | "
      f"MVP: {int(enriched['won_mvp'].sum())}")

# Seasons where big buy missed all awards
misses = enriched[enriched["won_any"] == False]
if len(misses) > 0:
    print(f"\nSeasons where the big buy was a TOTAL MISS:")
    for _, m in misses.iterrows():
        runs_str = f"{int(m['buy_runs'])} runs" if pd.notna(m['buy_runs']) else "N/A runs"
        wkts_str = f"{int(m['buy_wickets'])} wkts" if pd.notna(m['buy_wickets']) else "N/A wkts"
        print(f"  {m['season']} - {m['highest_buy_player']} "
              f"(Rs {m['highest_buy_price_cr']}Cr) -> {runs_str}, {wkts_str}")

print(f"\nStep 4 complete.")
