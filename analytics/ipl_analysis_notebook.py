"""
IPL Auction Intelligence — Analysis Notebook
=============================================
Answers all 10 core research questions using
batting_agg.csv, bowling_agg.csv, player_value_scores.csv, ipl_awards_prices.csv

Run from repo root:
    python analytics/ipl_analysis_notebook.py

Requirements: pip install pandas matplotlib seaborn scipy
"""

import os
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import seaborn as sns
from scipy import stats

# ── Paths ──────────────────────────────────────────────────────────────────
BASE = os.path.join(os.path.dirname(__file__), "..", "public", "data", "processed")
BAT_PATH   = os.path.join(BASE, "batting_agg.csv")
BOWL_PATH  = os.path.join(BASE, "bowling_agg.csv")
VAL_PATH   = os.path.join(BASE, "player_value_scores.csv")
AWD_PATH   = os.path.join(BASE, "ipl_awards_prices.csv")
OUT_DIR    = os.path.join(os.path.dirname(__file__), "..", "data", "output")
os.makedirs(OUT_DIR, exist_ok=True)

# ── Style ───────────────────────────────────────────────────────────────────
plt.style.use("dark_background")
PALETTE = ["#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4899"]
sns.set_palette(PALETTE)

# ── Load Data ───────────────────────────────────────────────────────────────
print("Loading data...")
bat   = pd.read_csv(BAT_PATH)
bowl  = pd.read_csv(BOWL_PATH)
val   = pd.read_csv(VAL_PATH)
awards = pd.read_csv(AWD_PATH) if os.path.exists(AWD_PATH) else pd.DataFrame()

print(f"  Batting: {len(bat):,} rows, {bat['player'].nunique()} unique players")
print(f"  Bowling: {len(bowl):,} rows, {bowl['player'].nunique()} unique players")
print(f"  Values:  {len(val):,} rows")
print(f"  Awards:  {len(awards):,} rows")
print()

# ── Q1: Highest Auction ROI ─────────────────────────────────────────────────
print("=" * 60)
print("Q1: Which players deliver the highest auction ROI?")
print("=" * 60)

priced = val[val["price_cr"].notna() & (val["price_cr"] > 0)].copy()
priced["roi"] = priced["raw_score"] / priced["price_cr"]
top_roi = (
    priced[priced["is_big_buy"] == False]  # exclude record buys for clearer signal
    .sort_values("roi", ascending=False)
    .head(15)[["player", "season", "price_cr", "raw_score", "roi"]]
)
print(top_roi.to_string(index=False))

# Plot
fig, ax = plt.subplots(figsize=(12, 6))
top10 = top_roi.head(10)
bars = ax.barh(top10["player"] + " (" + top10["season"].astype(str) + ")",
               top10["roi"], color=PALETTE[0], alpha=0.85)
ax.set_xlabel("Value Score / ₹ Crore")
ax.set_title("Q1 — Top 10 Auction ROI Players (non-record buys)")
ax.invert_yaxis()
plt.tight_layout()
plt.savefig(os.path.join(OUT_DIR, "q1_top_roi_players.png"), dpi=150, bbox_inches="tight")
plt.close()
print("  Saved → data/output/q1_top_roi_players.png\n")


# ── Q2: Uncapped vs Capped Value ────────────────────────────────────────────
print("=" * 60)
print("Q2: Uncapped vs Capped — who's cheaper per unit of value?")
print("=" * 60)

# Proxy: if price_cr < 0.5 treat as likely uncapped base price
priced2 = priced.copy()
priced2["tier"] = pd.cut(
    priced2["price_cr"],
    bins=[0, 0.75, 2.0, 5.0, 100],
    labels=["Base (≤0.75Cr)", "Budget (0.75–2Cr)", "Premium (2–5Cr)", "Marquee (5Cr+)"]
)
tier_summary = priced2.groupby("tier")["roi"].agg(["median", "mean", "count"]).round(2)
print(tier_summary)

fig, ax = plt.subplots(figsize=(10, 5))
sns.boxplot(data=priced2, x="tier", y="roi", ax=ax, palette=PALETTE[:4])
ax.set_xlabel("Price Tier")
ax.set_ylabel("ROI (Value Score / ₹Cr)")
ax.set_title("Q2 — Auction ROI by Price Tier")
ax.set_ylim(0, priced2["roi"].quantile(0.95))
plt.tight_layout()
plt.savefig(os.path.join(OUT_DIR, "q2_roi_by_price_tier.png"), dpi=150, bbox_inches="tight")
plt.close()
print("  Saved → data/output/q2_roi_by_price_tier.png\n")


# ── Q3: Archetype Pricing Gap ───────────────────────────────────────────────
print("=" * 60)
print("Q3: Player archetype distribution (from batting stats)")
print("=" * 60)

league_avg_sr  = bat["strike_rate"].mean()
league_avg_avg = bat["batting_average"].mean()
league_avg_eco = bowl["economy"].mean()

def classify(row):
    sr  = row.get("strike_rate", league_avg_sr)
    avg = row.get("batting_average", league_avg_avg)
    eco = row.get("economy", league_avg_eco)
    wk  = row.get("wickets", 0)

    sr_diff  = (sr - league_avg_sr) / league_avg_sr * 100
    avg_diff = (avg - league_avg_avg) / league_avg_avg * 100
    eco_diff = (eco - league_avg_eco) / league_avg_eco * 100 if eco > 0 else 0

    if sr_diff >= 20:
        return "Power Finisher"
    elif avg_diff >= 30:
        return "Technical Anchor"
    elif wk > 5 or eco_diff < -10:
        return "Control Bowler"
    elif eco_diff > 10:
        return "Wicket Hunter"
    else:
        return "Reliable Rotator"

bat_bowl = bat.merge(
    bowl.groupby("player").agg(economy=("economy","mean"), wickets=("wickets","sum")).reset_index(),
    on="player", how="left"
)
bat_bowl["economy"]  = bat_bowl["economy"].fillna(league_avg_eco)
bat_bowl["wickets"]  = bat_bowl["wickets"].fillna(0)
bat_bowl["archetype"] = bat_bowl.apply(classify, axis=1)

arch_counts = bat_bowl["archetype"].value_counts()
print(arch_counts)

fig, ax = plt.subplots(figsize=(8, 5))
arch_counts.plot(kind="bar", ax=ax, color=PALETTE, edgecolor="none")
ax.set_title("Q3 — Player Archetype Distribution")
ax.set_xlabel("Archetype")
ax.set_ylabel("Player-Seasons")
plt.xticks(rotation=30, ha="right")
plt.tight_layout()
plt.savefig(os.path.join(OUT_DIR, "q3_archetype_distribution.png"), dpi=150, bbox_inches="tight")
plt.close()
print("  Saved → data/output/q3_archetype_distribution.png\n")


# ── Q5: Price vs Performance Correlation ────────────────────────────────────
print("=" * 60)
print("Q5: Is there a correlation between bid price and performance?")
print("=" * 60)

corr_data = priced[["price_cr", "raw_score"]].dropna()
spearman_r, spearman_p = stats.spearmanr(corr_data["price_cr"], corr_data["raw_score"])
pearson_r, pearson_p   = stats.pearsonr(corr_data["price_cr"], corr_data["raw_score"])
print(f"  Spearman r = {spearman_r:.3f}  (p = {spearman_p:.4f})")
print(f"  Pearson  r = {pearson_r:.3f}  (p = {pearson_p:.4f})")
if abs(spearman_r) < 0.3:
    print("  ⚠ Weak correlation — paying more does NOT reliably buy more performance.")
else:
    print("  ✓ Moderate correlation detected.")

fig, ax = plt.subplots(figsize=(9, 6))
ax.scatter(corr_data["price_cr"], corr_data["raw_score"],
           alpha=0.4, color=PALETTE[0], s=20, label="Player-Season")
m, b = stats.linregress(corr_data["price_cr"], corr_data["raw_score"])[:2]
x_range = [corr_data["price_cr"].min(), corr_data["price_cr"].max()]
ax.plot(x_range, [m*x + b for x in x_range], color=PALETTE[1], lw=2, label=f"Trend (r={pearson_r:.2f})")
ax.set_xlabel("Auction Price (₹ Crore)")
ax.set_ylabel("Raw Performance Score")
ax.set_title("Q5 — Auction Price vs On-Field Performance")
ax.legend()
plt.tight_layout()
plt.savefig(os.path.join(OUT_DIR, "q5_price_vs_performance.png"), dpi=150, bbox_inches="tight")
plt.close()
print("  Saved → data/output/q5_price_vs_performance.png\n")


# ── Q6: Market Inefficiency by Season ───────────────────────────────────────
print("=" * 60)
print("Q6: Which seasons showed the highest market inefficiency?")
print("=" * 60)

season_eff = (
    priced.groupby("season")
    .agg(avg_roi=("roi", "mean"), total_spend=("price_cr", "sum"), count=("roi", "count"))
    .reset_index()
)
season_eff["efficiency_index"] = season_eff["avg_roi"] / season_eff["total_spend"] * 100
print(season_eff[["season", "avg_roi", "total_spend", "efficiency_index"]].to_string(index=False))

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8), sharex=True)
ax1.plot(season_eff["season"], season_eff["avg_roi"], marker="o", color=PALETTE[0], lw=2)
ax1.set_ylabel("Avg ROI per Player")
ax1.set_title("Q6 — Market Efficiency by Season")
ax1.fill_between(season_eff["season"], season_eff["avg_roi"], alpha=0.15, color=PALETTE[0])

ax2.bar(season_eff["season"], season_eff["total_spend"], color=PALETTE[1], alpha=0.8)
ax2.set_xlabel("Season")
ax2.set_ylabel("Total Auction Spend (₹ Cr tracked)")
plt.tight_layout()
plt.savefig(os.path.join(OUT_DIR, "q6_market_efficiency_by_season.png"), dpi=150, bbox_inches="tight")
plt.close()
print("  Saved → data/output/q6_market_efficiency_by_season.png\n")


# ── Q7: Bowlers vs Batters ───────────────────────────────────────────────────
print("=" * 60)
print("Q7: Do bowlers or batters deliver better auction value?")
print("=" * 60)

# Classify role by contribution: if bowling_bonus > batting raw_score component → bowler
val2 = val.copy()
val2["role"] = val2.apply(
    lambda r: "Bowler-dominant"
    if (r.get("wickets", 0) > 3 and r.get("total_runs", 0) < 100)
    else ("Batter-dominant" if r.get("total_runs", 0) >= 100 else "Allrounder"),
    axis=1
)
role_summary = val2.groupby("role")["raw_score"].agg(["mean", "median", "count"]).round(2)
print(role_summary)

fig, ax = plt.subplots(figsize=(8, 5))
sns.boxplot(data=val2, x="role", y="raw_score", ax=ax, palette=PALETTE[:3])
ax.set_ylim(0, val2["raw_score"].quantile(0.97))
ax.set_title("Q7 — Raw Score Distribution by Player Role")
ax.set_xlabel("Role")
ax.set_ylabel("Raw Performance Score")
plt.tight_layout()
plt.savefig(os.path.join(OUT_DIR, "q7_score_by_role.png"), dpi=150, bbox_inches="tight")
plt.close()
print("  Saved → data/output/q7_score_by_role.png\n")


# ── Summary ─────────────────────────────────────────────────────────────────
print("=" * 60)
print("ANALYSIS COMPLETE — All charts saved to data/output/")
print("=" * 60)
print(f"  Total seasons analysed: {val['season'].nunique()}")
print(f"  Total unique players:   {val['player'].nunique()}")
print(f"  Players with price data:{len(priced['player'].unique())}")
if not awards.empty:
    hit_rate = (
        awards["highest_buy_player"].isin(awards.get("player_of_tournament", pd.Series()))
    ).mean() * 100
    print(f"  Biggest buy hit rate:   {hit_rate:.1f}%")
