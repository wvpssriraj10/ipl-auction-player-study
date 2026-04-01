"""
Step 5 — Compute Value Scores for every player every season.
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

# ── Surname-based matching helper ──────────────────────────────
def get_surname(name):
    parts = str(name).strip().split()
    return parts[-1].lower() if parts else ""

def smart_find(award_name, candidates):
    """Match award name to CSV name using surname-first strategy."""
    if not candidates or pd.isna(award_name):
        return None
    award_name = str(award_name).strip()

    # 1. Exact match
    for c in candidates:
        if str(c).strip().lower() == award_name.lower():
            return c

    # 2. Surname match
    award_surname = get_surname(award_name)
    surname_matches = [c for c in candidates if get_surname(c) == award_surname]

    if len(surname_matches) == 1:
        return surname_matches[0]
    if len(surname_matches) > 1:
        best_name, best_score = None, 0
        for c in surname_matches:
            score = fuzz.token_sort_ratio(award_name, c)
            if score > best_score:
                best_name, best_score = c, score
        return best_name

    # 3. Fallback fuzzy
    best_name, best_score = None, 0
    for c in candidates:
        score = fuzz.token_sort_ratio(award_name, c)
        if score > best_score:
            best_name, best_score = c, score
    return best_name if best_score >= 60 else None

# ── Load data ──────────────────────────────────────────────────
batting = pd.read_csv(BATTING_CSV)
bowling = pd.read_csv(BOWLING_CSV)
awards  = pd.read_csv(AWARDS_CSV)

print(f"Batting: {batting.shape}")
print(f"Bowling: {bowling.shape}")
print(f"Awards:  {awards.shape}")

# ── Merge batting and bowling into a single player-season DF ──
batting_cols = ["season", "player", "total_runs", "balls_faced",
                "strike_rate", "fours", "sixes", "matches", "innings"]
bowling_cols = ["season", "player", "wickets", "runs_conceded",
                "balls_bowled", "economy", "matches_bowled"]

for c in batting_cols:
    if c not in batting.columns:
        batting[c] = np.nan
for c in bowling_cols:
    if c not in bowling.columns:
        bowling[c] = np.nan

merged = batting[batting_cols].merge(
    bowling[bowling_cols],
    on=["season", "player"],
    how="outer"
)

# Fill NaN stats with 0 for scoring
for col in ["total_runs", "balls_faced", "strike_rate", "fours", "sixes",
            "wickets", "runs_conceded", "balls_bowled", "economy"]:
    if col in merged.columns:
        merged[col] = merged[col].fillna(0)

print(f"\nMerged player-season DF: {merged.shape}")

# ── Compute raw score ──────────────────────────────────────────
def batting_component(row):
    if row["balls_faced"] >= 50:
        return row["total_runs"] * (row["strike_rate"] / 100)
    return 0.0

def bowling_component(row):
    if row["balls_bowled"] >= 60 and row["economy"] > 0:
        return row["wickets"] * (8 / row["economy"])
    return 0.0

merged["bat_component"]  = merged.apply(batting_component, axis=1)
merged["bowl_component"] = merged.apply(bowling_component, axis=1)
merged["raw_score"]      = merged["bat_component"] + merged["bowl_component"]

# ── Tag highest buy players & compute value score ──────────────
merged["price_cr"]    = np.nan
merged["is_big_buy"]  = False
merged["value_score"] = merged["raw_score"]  # default for non-big-buys

# Build season -> highest_buy mapping
for _, arow in awards.iterrows():
    season = arow["season"]
    player_name = arow["highest_buy_player"]
    price = arow["highest_buy_price_cr"]

    season_mask = merged["season"] == season
    candidates = merged.loc[season_mask, "player"].dropna().unique().tolist()

    matched_name = smart_find(player_name, candidates)

    if matched_name:
        idx = merged[(merged["season"] == season) & (merged["player"] == matched_name)].index
        if len(idx) > 0:
            merged.loc[idx, "price_cr"]   = price
            merged.loc[idx, "is_big_buy"] = True
            raw = merged.loc[idx, "raw_score"].values[0]
            merged.loc[idx, "value_score"] = raw / price if price > 0 else 0
            print(f"  [{season}] {player_name} -> {matched_name} (Rs {price}Cr, raw={raw:.1f}, value={raw/price:.2f})")
    else:
        print(f"  [{season}] {player_name} -> NOT FOUND")

# ── Final columns and sort ─────────────────────────────────────
final_cols = ["player", "season", "total_runs", "balls_faced", "strike_rate",
              "fours", "sixes", "wickets", "balls_bowled", "economy",
              "raw_score", "price_cr", "value_score", "is_big_buy"]

for c in final_cols:
    if c not in merged.columns:
        merged[c] = np.nan

merged = merged[final_cols].sort_values("value_score", ascending=False).reset_index(drop=True)
merged.to_csv(VALUE_CSV, index=False)

# ── Print top/bottom big buys ──────────────────────────────────
big_buys = merged[merged["is_big_buy"] == True].copy()

print(f"\n{'='*80}")
print("TOP 10 BEST VALUE BIG BUYS:")
print(f"{'='*80}")
top10 = big_buys.sort_values("value_score", ascending=False).head(10)
for _, r in top10.iterrows():
    print(f"  [{int(r['season'])}] {r['player']} (Rs {r['price_cr']}Cr) "
          f"-> {int(r['total_runs'])} runs @ {r['strike_rate']} SR | "
          f"{int(r['wickets'])} wkts @ {r['economy']} eco | "
          f"Value Score: {r['value_score']:.2f}")

print(f"\n{'='*80}")
print("TOP 5 WORST VALUE BIG BUYS (min qualifier: 30 balls faced or bowled):")
print(f"{'='*80}")
qualified = big_buys[(big_buys["balls_faced"] >= 30) | (big_buys["balls_bowled"] >= 30)]
worst5 = qualified.sort_values("value_score", ascending=True).head(5)
for _, r in worst5.iterrows():
    print(f"  [{int(r['season'])}] {r['player']} (Rs {r['price_cr']}Cr) "
          f"-> {int(r['total_runs'])} runs @ {r['strike_rate']} SR | "
          f"{int(r['wickets'])} wkts @ {r['economy']} eco | "
          f"Value Score: {r['value_score']:.2f}")

print(f"\nStep 5 complete — player_value_scores.csv saved.")
