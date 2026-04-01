"""
Step 6 — Generate all four visualisation charts.
"""
import os
import sys
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")           # non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns

try:
    from adjustText import adjust_text
    HAS_ADJUST_TEXT = True
except ImportError:
    HAS_ADJUST_TEXT = False
    print("⚠ adjustText not installed — labels may overlap. pip install adjustText")

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

# ── Global style ────────────────────────────────────────────────
sns.set_style("whitegrid")
plt.rcParams["font.family"] = "DejaVu Sans"
DPI = 150

COLORS = {
    "green":  "#2ecc71",
    "red":    "#e74c3c",
    "blue":   "#3498db",
    "orange": "#f39c12",
    "dark":   "#2c3e50",
    "grey":   "#95a5a6",
}

# ── Load data ──────────────────────────────────────────────────
awards = pd.read_csv(AWARDS_CSV)
values = pd.read_csv(VALUE_CSV)

# Ensure won_any is bool
for col in ["won_orange", "won_purple", "won_mvp", "won_any"]:
    if col in awards.columns:
        awards[col] = awards[col].astype(bool)

# ================================================================
#  CHART 1 — Scatter: Price vs Performance
# ================================================================
print("Generating Chart 1 — Price vs Performance scatter …")

fig, ax1 = plt.subplots(figsize=(14, 8))

# Use buy_runs as Y-axis
x = awards["highest_buy_price_cr"]
y = awards["buy_runs"].fillna(0)
colors_c1 = [COLORS["green"] if w else COLORS["red"] for w in awards["won_any"]]
sizes = awards["highest_buy_price_cr"] * 15

ax1.scatter(x, y, c=colors_c1, s=sizes, alpha=0.8, edgecolors=COLORS["dark"], linewidths=0.8, zorder=5)

# Annotate
texts = []
for _, r in awards.iterrows():
    label = f"{r['highest_buy_player']}\n({int(r['season'])})"
    t = ax1.text(r["highest_buy_price_cr"], r.get("buy_runs", 0) or 0,
                 label, fontsize=7, ha="center", va="bottom")
    texts.append(t)

if HAS_ADJUST_TEXT:
    adjust_text(texts, ax=ax1, arrowprops=dict(arrowstyle="-", color=COLORS["grey"], lw=0.5))

ax1.set_xlabel("Auction Price (₹ Crore)", fontsize=12, color=COLORS["dark"])
ax1.set_ylabel("Runs Scored That Season", fontsize=12, color=COLORS["dark"])
ax1.set_title("IPL's Most Expensive Buy Each Season: Did They Deliver?",
              fontsize=14, fontweight="bold", color=COLORS["dark"], pad=15)

# Legend
from matplotlib.lines import Line2D
legend_elements = [
    Line2D([0], [0], marker="o", color="w", markerfacecolor=COLORS["green"],
           markersize=10, label="Won Award"),
    Line2D([0], [0], marker="o", color="w", markerfacecolor=COLORS["red"],
           markersize=10, label="No Award"),
]
ax1.legend(handles=legend_elements, loc="upper left", fontsize=10)
ax1.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(CHART1, dpi=DPI, bbox_inches="tight")
plt.close()
print(f"  Saved → {CHART1}")

# ================================================================
#  CHART 2 — Bar: Hit Rate by Season
# ================================================================
print("Generating Chart 2 — Hit rate by season bar chart …")

fig, ax = plt.subplots(figsize=(16, 7))

seasons = awards["season"].astype(int)
won_int = awards["won_any"].astype(int)
bar_colors = [COLORS["green"] if w else COLORS["red"] for w in awards["won_any"]]

bars = ax.bar(seasons, won_int, color=bar_colors, edgecolor=COLORS["dark"],
              linewidth=0.5, width=0.7, zorder=3)

# Mean line
mean_rate = won_int.mean() * 100
ax.axhline(y=won_int.mean(), color=COLORS["blue"], linestyle="--",
           linewidth=1.5, label=f"Mean: {mean_rate:.0f}%", zorder=4)

# Annotate player names on each bar
for i, (_, r) in enumerate(awards.iterrows()):
    ax.text(int(r["season"]), 0.02, r["highest_buy_player"],
            rotation=45, fontsize=7.5, ha="left", va="bottom",
            color=COLORS["dark"], fontweight="bold")

ax.set_xlabel("Season", fontsize=12, color=COLORS["dark"])
ax.set_ylabel("Won Any Award (0/1)", fontsize=12, color=COLORS["dark"])
ax.set_title("Did the Season's Biggest Buy Win Any Award? (2008–2025)",
             fontsize=14, fontweight="bold", color=COLORS["dark"], pad=15)
ax.set_xticks(seasons)
ax.set_xticklabels(seasons, rotation=45)
ax.set_yticks([0, 1])
ax.set_yticklabels(["No", "Yes"])
ax.legend(fontsize=11, loc="upper right")
ax.grid(axis="y", alpha=0.3)

plt.tight_layout()
plt.savefig(CHART2, dpi=DPI, bbox_inches="tight")
plt.close()
print(f"  Saved → {CHART2}")

# ================================================================
#  CHART 3 — Horizontal Bar: Value Leaderboard (top big buys)
# ================================================================
print("Generating Chart 3 — Value leaderboard …")

big_buys = values[values["is_big_buy"] == True].copy()
top_buys = big_buys.sort_values("value_score", ascending=False).head(18)

fig, ax = plt.subplots(figsize=(12, 9))

y_pos = range(len(top_buys))
colors_c3 = [COLORS["green"] if vs > top_buys["value_score"].median() else COLORS["orange"]
             for vs in top_buys["value_score"]]

ax.barh(y_pos, top_buys["value_score"], color=colors_c3,
        edgecolor=COLORS["dark"], linewidth=0.5, height=0.7, zorder=3)

labels = [f"{r['player']} ({int(r['season'])})" for _, r in top_buys.iterrows()]
ax.set_yticks(y_pos)
ax.set_yticklabels(labels, fontsize=9)
ax.invert_yaxis()

# Annotate value score on each bar
for i, (_, r) in enumerate(top_buys.iterrows()):
    ax.text(r["value_score"] + 0.3, i, f"{r['value_score']:.1f}",
            va="center", fontsize=8, color=COLORS["dark"], fontweight="bold")

ax.set_xlabel("Value Score (Raw Score / Price ₹Cr)", fontsize=12, color=COLORS["dark"])
ax.set_title("IPL Biggest Buys — Value Score Leaderboard",
             fontsize=14, fontweight="bold", color=COLORS["dark"], pad=15)
ax.grid(axis="x", alpha=0.3)

plt.tight_layout()
plt.savefig(CHART3, dpi=DPI, bbox_inches="tight")
plt.close()
print(f"  Saved → {CHART3}")

# ================================================================
#  CHART 4 — Era Analysis: grouped bar chart
# ================================================================
print("Generating Chart 4 — Era analysis …")

# Define eras
def classify_era(season):
    if season <= 2013:
        return "Early (2008–13)"
    elif season <= 2019:
        return "Middle (2014–19)"
    else:
        return "Modern (2020–25)"

awards["era"] = awards["season"].apply(classify_era)

era_stats = awards.groupby("era").agg(
    avg_price     = ("highest_buy_price_cr", "mean"),
    avg_runs      = ("buy_runs", "mean"),
    award_hit_pct = ("won_any", lambda x: x.mean() * 100),
    seasons_count = ("season", "count"),
).reindex(["Early (2008–13)", "Middle (2014–19)", "Modern (2020–25)"])

fig, axes = plt.subplots(1, 3, figsize=(16, 6))

# Sub-plot 1: Avg Price
axes[0].bar(era_stats.index, era_stats["avg_price"],
            color=[COLORS["blue"], COLORS["orange"], COLORS["green"]],
            edgecolor=COLORS["dark"], linewidth=0.5, zorder=3)
axes[0].set_title("Avg Auction Price (₹Cr)", fontsize=11, fontweight="bold")
axes[0].set_ylabel("₹ Crore", fontsize=10)
for i, v in enumerate(era_stats["avg_price"]):
    axes[0].text(i, v + 0.3, f"₹{v:.1f}", ha="center", fontsize=9, fontweight="bold")

# Sub-plot 2: Avg Runs
axes[1].bar(era_stats.index, era_stats["avg_runs"].fillna(0),
            color=[COLORS["blue"], COLORS["orange"], COLORS["green"]],
            edgecolor=COLORS["dark"], linewidth=0.5, zorder=3)
axes[1].set_title("Avg Runs by Big Buy", fontsize=11, fontweight="bold")
axes[1].set_ylabel("Runs", fontsize=10)
for i, v in enumerate(era_stats["avg_runs"].fillna(0)):
    axes[1].text(i, v + 3, f"{v:.0f}", ha="center", fontsize=9, fontweight="bold")

# Sub-plot 3: Award Hit %
axes[2].bar(era_stats.index, era_stats["award_hit_pct"],
            color=[COLORS["blue"], COLORS["orange"], COLORS["green"]],
            edgecolor=COLORS["dark"], linewidth=0.5, zorder=3)
axes[2].set_title("Award Hit Rate (%)", fontsize=11, fontweight="bold")
axes[2].set_ylabel("% Seasons", fontsize=10)
for i, v in enumerate(era_stats["award_hit_pct"]):
    axes[2].text(i, v + 1, f"{v:.0f}%", ha="center", fontsize=9, fontweight="bold")

for ax_item in axes:
    ax_item.tick_params(axis="x", rotation=15, labelsize=8)
    ax_item.grid(axis="y", alpha=0.3)

fig.suptitle("IPL Auction Eras: How Has the Big Buy Trend Evolved?",
             fontsize=14, fontweight="bold", color=COLORS["dark"], y=1.02)

plt.tight_layout()
plt.savefig(CHART4, dpi=DPI, bbox_inches="tight")
plt.close()
print(f"  Saved → {CHART4}")

# ================================================================
#  SUMMARY REPORT
# ================================================================
print("\nGenerating summary report …")

total = len(awards)
hit   = awards["won_any"].sum()
miss  = total - hit

report_lines = [
    "=" * 70,
    "  IPL AUCTION FEES vs ON-FIELD PERFORMANCE — SUMMARY REPORT",
    "=" * 70,
    "",
    f"Study Period: 2008–2025 ({total} seasons)",
    "",
    "KEY FINDINGS:",
    f"  • Big buy won at least one award in {hit}/{total} seasons ({hit/total*100:.1f}%)",
    f"  • Big buy missed ALL awards in {miss}/{total} seasons ({miss/total*100:.1f}%)",
    f"  • Orange Cap wins:  {awards['won_orange'].sum()}",
    f"  • Purple Cap wins:  {awards['won_purple'].sum()}",
    f"  • MVP wins:         {awards['won_mvp'].sum()}",
    "",
    "ERA ANALYSIS:",
]

for era_name in ["Early (2008–13)", "Middle (2014–19)", "Modern (2020–25)"]:
    if era_name in era_stats.index:
        e = era_stats.loc[era_name]
        report_lines.append(
            f"  {era_name}: Avg Price ₹{e['avg_price']:.1f}Cr | "
            f"Avg Runs {e['avg_runs']:.0f} | Award Hit {e['award_hit_pct']:.0f}%"
        )

report_lines += [
    "",
    "TOP 5 BEST VALUE BIG BUYS:",
]
best5 = big_buys.sort_values("value_score", ascending=False).head(5)
for _, r in best5.iterrows():
    report_lines.append(
        f"  [{int(r['season'])}] {r['player']} (₹{r['price_cr']}Cr) "
        f"— Value Score: {r['value_score']:.2f}"
    )

report_lines += [
    "",
    "TOP 5 WORST VALUE BIG BUYS:",
]
qualified = big_buys[(big_buys["balls_faced"] >= 30) | (big_buys["balls_bowled"] >= 30)]
worst5 = qualified.sort_values("value_score", ascending=True).head(5)
for _, r in worst5.iterrows():
    report_lines.append(
        f"  [{int(r['season'])}] {r['player']} (₹{r['price_cr']}Cr) "
        f"— Value Score: {r['value_score']:.2f}"
    )

report_lines += ["", "=" * 70, "  Report generated by step6_visualize.py", "=" * 70]

report_text = "\n".join(report_lines)
with open(REPORT_TXT, "w", encoding="utf-8") as f:
    f.write(report_text)

print(report_text)
print(f"\nSummary report saved → {REPORT_TXT}")
print(f"\nStep 6 complete — all charts and summary report generated.")
