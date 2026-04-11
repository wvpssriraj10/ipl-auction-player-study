"""
Step 7 — Generate a presentation-ready HTML report.
Self-contained single HTML file with embedded charts and professional styling.
"""
import os
import base64
import pandas as pd
import numpy as np
from datetime import datetime

# ── Path constants ──────────────────────────────────────────────
BASE_DIR      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
OUTPUT_DIR    = os.path.join(BASE_DIR, "data", "output")
REPORTS_DIR   = os.path.join(BASE_DIR, "reports")

AWARDS_CSV = os.path.join(PROCESSED_DIR, "ipl_awards_prices.csv")
VALUE_CSV  = os.path.join(PROCESSED_DIR, "player_value_scores.csv")

CHART1 = os.path.join(OUTPUT_DIR, "chart1_price_vs_performance.png")
CHART2 = os.path.join(OUTPUT_DIR, "chart2_hit_rate_by_season.png")
CHART3 = os.path.join(OUTPUT_DIR, "chart3_value_leaderboard.png")
CHART4 = os.path.join(OUTPUT_DIR, "chart4_era_analysis.png")

REPORT_HTML = os.path.join(REPORTS_DIR, "ipl_auction_report.html")

os.makedirs(REPORTS_DIR, exist_ok=True)

# ── Helper: embed image as base64 ──────────────────────────────
def img_to_base64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

# ── Load data ──────────────────────────────────────────────────
awards = pd.read_csv(AWARDS_CSV)
values = pd.read_csv(VALUE_CSV)
big_buys = values[values["is_big_buy"] == True].copy()

for col in ["won_orange", "won_purple", "won_mvp", "won_any"]:
    if col in awards.columns:
        awards[col] = awards[col].astype(bool)

# ── Compute stats ──────────────────────────────────────────────
total_seasons = len(awards)
hit_count = int(awards["won_any"].sum())
miss_count = total_seasons - hit_count
hit_pct = hit_count / total_seasons * 100
orange_wins = int(awards["won_orange"].sum())
purple_wins = int(awards["won_purple"].sum())
mvp_wins = int(awards["won_mvp"].sum())

avg_price = awards["highest_buy_price_cr"].mean()
max_price_row = awards.loc[awards["highest_buy_price_cr"].idxmax()]
min_price_row = awards.loc[awards["highest_buy_price_cr"].idxmin()]

# Era analysis
def classify_era(s):
    if s <= 2013: return "Early (2008–13)"
    elif s <= 2019: return "Middle (2014–19)"
    else: return "Modern (2020–25)"

awards["era"] = awards["season"].apply(classify_era)
era_stats = awards.groupby("era").agg(
    avg_price=("highest_buy_price_cr", "mean"),
    avg_runs=("buy_runs", "mean"),
    award_hit_pct=("won_any", lambda x: x.mean() * 100),
    seasons_count=("season", "count"),
).reindex(["Early (2008–13)", "Middle (2014–19)", "Modern (2020–25)"])

# Best & worst
best_buys = big_buys.sort_values("value_score", ascending=False).head(5)
qualified = big_buys[(big_buys["balls_faced"] >= 30) | (big_buys["balls_bowled"] >= 30)]
worst_buys = qualified.sort_values("value_score", ascending=True).head(5)

# Top overall performers per season (non big-buy)
top_season_performers = values.groupby("season").apply(
    lambda g: g.nlargest(1, "raw_score")
).reset_index(drop=True)[["season", "player", "total_runs", "wickets", "raw_score"]].head(18)

# ── Embed charts ───────────────────────────────────────────────
chart1_b64 = img_to_base64(CHART1)
chart2_b64 = img_to_base64(CHART2)
chart3_b64 = img_to_base64(CHART3)
chart4_b64 = img_to_base64(CHART4)

# ── Season-by-season table rows ────────────────────────────────
season_rows = ""
for _, r in awards.iterrows():
    won_class = "won" if r["won_any"] else "lost"
    award_badge = "✅ Yes" if r["won_any"] else "❌ No"
    runs = int(r["buy_runs"]) if pd.notna(r["buy_runs"]) else "—"
    wkts = int(r["buy_wickets"]) if pd.notna(r["buy_wickets"]) else "—"
    sr_val = f"{r['buy_sr']:.1f}" if pd.notna(r["buy_sr"]) else "—"
    eco_val = f"{r['buy_economy']:.2f}" if pd.notna(r["buy_economy"]) else "—"
    season_rows += f"""
        <tr class="{won_class}">
            <td>{int(r['season'])}</td>
            <td class="player-name">{r['highest_buy_player']}</td>
            <td>{r['highest_buy_team']}</td>
            <td class="price">₹{r['highest_buy_price_cr']}Cr</td>
            <td>{runs}</td>
            <td>{sr_val}</td>
            <td>{wkts}</td>
            <td>{eco_val}</td>
            <td class="badge-cell"><span class="badge badge-{won_class}">{award_badge}</span></td>
        </tr>"""

# ── Best value table rows ──────────────────────────────────────
best_rows = ""
for rank, (_, r) in enumerate(best_buys.iterrows(), 1):
    best_rows += f"""
        <tr>
            <td class="rank">#{rank}</td>
            <td class="player-name">{r['player']}</td>
            <td>{int(r['season'])}</td>
            <td class="price">₹{r['price_cr']}Cr</td>
            <td>{int(r['total_runs'])}</td>
            <td>{int(r['wickets'])}</td>
            <td class="value-score">{r['value_score']:.1f}</td>
        </tr>"""

worst_rows = ""
for rank, (_, r) in enumerate(worst_buys.iterrows(), 1):
    worst_rows += f"""
        <tr>
            <td class="rank">#{rank}</td>
            <td class="player-name">{r['player']}</td>
            <td>{int(r['season'])}</td>
            <td class="price">₹{r['price_cr']}Cr</td>
            <td>{int(r['total_runs'])}</td>
            <td>{int(r['wickets'])}</td>
            <td class="value-score">{r['value_score']:.2f}</td>
        </tr>"""

# ── Top performer rows ─────────────────────────────────────────
top_perf_rows = ""
for _, r in top_season_performers.iterrows():
    top_perf_rows += f"""
        <tr>
            <td>{int(r['season'])}</td>
            <td class="player-name">{r['player']}</td>
            <td>{int(r['total_runs'])}</td>
            <td>{int(r['wickets'])}</td>
            <td class="value-score">{r['raw_score']:.1f}</td>
        </tr>"""

# ── Award winner table ─────────────────────────────────────────
award_rows = ""
for _, r in awards.iterrows():
    award_rows += f"""
        <tr>
            <td>{int(r['season'])}</td>
            <td class="player-name">{r['orange_cap']}</td>
            <td class="player-name">{r['purple_cap']}</td>
            <td class="player-name">{r['mvp']}</td>
        </tr>"""

# ── Generate timestamp ─────────────────────────────────────────
now = datetime.now().strftime("%B %d, %Y at %I:%M %p")

# ── Build HTML ─────────────────────────────────────────────────
html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>IPL Auction Study — Premium Report</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
:root {{
    --bg-primary: #0a0e1a;
    --bg-secondary: #111827;
    --bg-card: #1a2035;
    --bg-card-hover: #1e2640;
    --accent-blue: #3b82f6;
    --accent-cyan: #06b6d4;
    --accent-green: #10b981;
    --accent-emerald: #34d399;
    --accent-orange: #f59e0b;
    --accent-red: #ef4444;
    --accent-purple: #8b5cf6;
    --accent-pink: #ec4899;
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    --border-color: rgba(255,255,255,0.06);
    --border-accent: rgba(59,130,246,0.3);
    --glass-bg: rgba(17,24,39,0.7);
    --glow-blue: 0 0 30px rgba(59,130,246,0.15);
    --glow-green: 0 0 30px rgba(16,185,129,0.15);
    --glow-orange: 0 0 30px rgba(245,158,11,0.15);
    --glow-red: 0 0 30px rgba(239,68,68,0.15);
}}

* {{ margin: 0; padding: 0; box-sizing: border-box; }}

body {{
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    line-height: 1.7;
    -webkit-font-smoothing: antialiased;
}}

/* ─── HERO SECTION ─── */
.hero {{
    position: relative;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    overflow: hidden;
    background: radial-gradient(ellipse at 30% 0%, rgba(59,130,246,0.12) 0%, transparent 60%),
                radial-gradient(ellipse at 70% 100%, rgba(139,92,246,0.1) 0%, transparent 60%),
                var(--bg-primary);
}}

.hero::before {{
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.02)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
    opacity: 0.5;
}}

.hero-content {{
    position: relative;
    z-index: 2;
    max-width: 900px;
    padding: 2rem;
}}

.hero-badge {{
    display: inline-block;
    padding: 0.4rem 1.2rem;
    border-radius: 100px;
    background: rgba(59,130,246,0.1);
    border: 1px solid rgba(59,130,246,0.25);
    color: var(--accent-blue);
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 2rem;
}}

.hero h1 {{
    font-family: 'Outfit', sans-serif;
    font-size: clamp(2.5rem, 6vw, 5rem);
    font-weight: 900;
    line-height: 1.1;
    background: linear-gradient(135deg, #ffffff 0%, #94a3b8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 1.5rem;
}}

.hero h1 span {{
    background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-cyan) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}}

.hero p {{
    font-size: 1.15rem;
    color: var(--text-secondary);
    max-width: 650px;
    margin: 0 auto 3rem;
    line-height: 1.8;
}}

.hero-stats {{
    display: flex;
    gap: 2rem;
    justify-content: center;
    flex-wrap: wrap;
}}

.hero-stat {{
    text-align: center;
    padding: 1.2rem 2rem;
    border-radius: 16px;
    background: var(--glass-bg);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border-color);
}}

.hero-stat .number {{
    font-family: 'Outfit', sans-serif;
    font-size: 2.2rem;
    font-weight: 800;
    background: linear-gradient(135deg, var(--accent-blue), var(--accent-cyan));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}}

.hero-stat .label {{
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 0.25rem;
}}

/* ─── NAVIGATION DOT ─── */
.scroll-indicator {{
    position: absolute;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
    animation: bounce 2s infinite;
}}

.scroll-indicator span {{
    display: block;
    width: 24px;
    height: 38px;
    border: 2px solid var(--text-muted);
    border-radius: 12px;
    position: relative;
}}

.scroll-indicator span::after {{
    content: '';
    position: absolute;
    top: 6px;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 8px;
    background: var(--accent-blue);
    border-radius: 2px;
    animation: scroll-dot 2s infinite;
}}

@keyframes bounce {{ 0%,100% {{ transform: translateX(-50%) translateY(0); }} 50% {{ transform: translateX(-50%) translateY(8px); }} }}
@keyframes scroll-dot {{ 0% {{ opacity: 1; top: 6px; }} 100% {{ opacity: 0; top: 20px; }} }}

/* ─── MAIN CONTAINER ─── */
.container {{
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
}}

/* ─── SECTIONS ─── */
section {{
    padding: 5rem 0;
    border-bottom: 1px solid var(--border-color);
}}

section:last-child {{ border-bottom: none; }}

.section-label {{
    display: inline-block;
    padding: 0.35rem 1rem;
    border-radius: 100px;
    background: rgba(59,130,246,0.08);
    border: 1px solid rgba(59,130,246,0.2);
    color: var(--accent-blue);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 1rem;
}}

.section-title {{
    font-family: 'Outfit', sans-serif;
    font-size: 2.2rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
}}

.section-subtitle {{
    font-size: 1rem;
    color: var(--text-secondary);
    margin-bottom: 3rem;
    max-width: 700px;
}}

/* ─── STAT CARDS ─── */
.stat-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.25rem;
    margin-bottom: 3rem;
}}

.stat-card {{
    padding: 1.8rem;
    border-radius: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}}

.stat-card::before {{
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    border-radius: 16px 16px 0 0;
}}

.stat-card.blue::before {{ background: linear-gradient(90deg, var(--accent-blue), var(--accent-cyan)); }}
.stat-card.green::before {{ background: linear-gradient(90deg, var(--accent-green), var(--accent-emerald)); }}
.stat-card.orange::before {{ background: linear-gradient(90deg, var(--accent-orange), #fbbf24); }}
.stat-card.red::before {{ background: linear-gradient(90deg, var(--accent-red), var(--accent-pink)); }}
.stat-card.purple::before {{ background: linear-gradient(90deg, var(--accent-purple), var(--accent-pink)); }}

.stat-card .stat-value {{
    font-family: 'Outfit', sans-serif;
    font-size: 2.4rem;
    font-weight: 800;
    margin-bottom: 0.3rem;
}}

.stat-card.blue .stat-value {{ color: var(--accent-blue); }}
.stat-card.green .stat-value {{ color: var(--accent-green); }}
.stat-card.orange .stat-value {{ color: var(--accent-orange); }}
.stat-card.red .stat-value {{ color: var(--accent-red); }}
.stat-card.purple .stat-value {{ color: var(--accent-purple); }}

.stat-card .stat-label {{
    font-size: 0.8rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}}

.stat-card .stat-detail {{
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-top: 0.5rem;
}}

/* ─── INSIGHT BOXES ─── */
.insight-box {{
    padding: 1.5rem 2rem;
    border-radius: 12px;
    border-left: 4px solid;
    margin-bottom: 1.5rem;
}}

.insight-box.finding {{
    background: rgba(59,130,246,0.06);
    border-color: var(--accent-blue);
}}

.insight-box.warning {{
    background: rgba(245,158,11,0.06);
    border-color: var(--accent-orange);
}}

.insight-box.success {{
    background: rgba(16,185,129,0.06);
    border-color: var(--accent-green);
}}

.insight-box.danger {{
    background: rgba(239,68,68,0.06);
    border-color: var(--accent-red);
}}

.insight-box h4 {{
    font-family: 'Outfit', sans-serif;
    font-size: 1rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
}}

.insight-box.finding h4 {{ color: var(--accent-blue); }}
.insight-box.warning h4 {{ color: var(--accent-orange); }}
.insight-box.success h4 {{ color: var(--accent-green); }}
.insight-box.danger h4 {{ color: var(--accent-red); }}

.insight-box p {{
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.7;
}}

/* ─── CHARTS ─── */
.chart-container {{
    margin: 2.5rem 0;
    border-radius: 16px;
    overflow: hidden;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    padding: 1.5rem;
}}

.chart-container img {{
    width: 100%;
    height: auto;
    display: block;
    border-radius: 8px;
}}

.chart-caption {{
    text-align: center;
    padding: 1rem 1.5rem 0.5rem;
    font-size: 0.85rem;
    color: var(--text-muted);
    font-style: italic;
}}

.chart-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
    gap: 1.5rem;
}}

/* ─── TABLES ─── */
.table-wrapper {{
    overflow-x: auto;
    border-radius: 16px;
    border: 1px solid var(--border-color);
    margin: 2rem 0;
}}

table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
}}

thead th {{
    background: var(--bg-secondary);
    padding: 1rem 1.2rem;
    text-align: left;
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    border-bottom: 2px solid var(--border-color);
    white-space: nowrap;
}}

tbody td {{
    padding: 0.85rem 1.2rem;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-secondary);
}}

tbody tr:last-child td {{ border-bottom: none; }}

tbody tr:hover {{
    background: rgba(59,130,246,0.04);
}}

tbody tr.won {{
    background: rgba(16,185,129,0.04);
}}

tbody tr.lost {{}}

td.player-name {{
    color: var(--text-primary);
    font-weight: 600;
    white-space: nowrap;
}}

td.price {{
    color: var(--accent-orange);
    font-weight: 600;
    font-family: 'Outfit', sans-serif;
    white-space: nowrap;
}}

td.value-score {{
    font-family: 'Outfit', sans-serif;
    font-weight: 700;
    color: var(--accent-cyan);
}}

td.rank {{
    font-family: 'Outfit', sans-serif;
    font-weight: 800;
    color: var(--text-muted);
}}

.badge {{
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 600;
}}

.badge-won {{
    background: rgba(16,185,129,0.15);
    color: var(--accent-green);
}}

.badge-lost {{
    background: rgba(239,68,68,0.1);
    color: var(--accent-red);
}}

td.badge-cell {{ white-space: nowrap; }}

/* ─── ERA CARDS ─── */
.era-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin: 2rem 0;
}}

.era-card {{
    padding: 2rem;
    border-radius: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    position: relative;
    overflow: hidden;
}}

.era-card::after {{
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    opacity: 0.05;
}}

.era-card.early {{ border-top: 3px solid var(--accent-blue); }}
.era-card.early::after {{ background: var(--accent-blue); }}

.era-card.middle {{ border-top: 3px solid var(--accent-orange); }}
.era-card.middle::after {{ background: var(--accent-orange); }}

.era-card.modern {{ border-top: 3px solid var(--accent-green); }}
.era-card.modern::after {{ background: var(--accent-green); }}

.era-card h3 {{
    font-family: 'Outfit', sans-serif;
    font-size: 1.2rem;
    font-weight: 700;
    margin-bottom: 1.2rem;
}}

.era-card.early h3 {{ color: var(--accent-blue); }}
.era-card.middle h3 {{ color: var(--accent-orange); }}
.era-card.modern h3 {{ color: var(--accent-green); }}

.era-stat {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--border-color);
}}

.era-stat:last-child {{ border-bottom: none; }}

.era-stat .era-label {{
    font-size: 0.85rem;
    color: var(--text-muted);
}}

.era-stat .era-value {{
    font-family: 'Outfit', sans-serif;
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--text-primary);
}}

/* ─── CONCLUSION ─── */
.conclusion {{
    text-align: center;
    padding: 5rem 2rem;
    background: radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.08) 0%, transparent 70%);
}}

.conclusion h2 {{
    font-family: 'Outfit', sans-serif;
    font-size: 2rem;
    font-weight: 800;
    margin-bottom: 1.5rem;
    background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}}

.conclusion p {{
    max-width: 750px;
    margin: 0 auto 1rem;
    font-size: 1.05rem;
    color: var(--text-secondary);
    line-height: 1.9;
}}

/* ─── FOOTER ─── */
.footer {{
    text-align: center;
    padding: 3rem 2rem;
    border-top: 1px solid var(--border-color);
    color: var(--text-muted);
    font-size: 0.8rem;
}}

.footer a {{
    color: var(--accent-blue);
    text-decoration: none;
}}

/* ─── METHODOLOGY ─── */
.method-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.25rem;
    margin: 2rem 0;
}}

.method-card {{
    padding: 1.5rem;
    border-radius: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
}}

.method-card .step-num {{
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(59,130,246,0.15);
    color: var(--accent-blue);
    font-family: 'Outfit', sans-serif;
    font-weight: 700;
    font-size: 0.85rem;
    margin-bottom: 0.75rem;
}}

.method-card h4 {{
    font-family: 'Outfit', sans-serif;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.4rem;
}}

.method-card p {{
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.6;
}}

/* ─── PRINT STYLES ─── */
@media print {{
    body {{ background: white; color: #1a1a1a; }}
    .hero {{ min-height: auto; padding: 3rem 0; background: white; }}
    .hero h1 {{ color: #1a1a1a; -webkit-text-fill-color: #1a1a1a; }}
    .hero h1 span {{ color: #2563eb; -webkit-text-fill-color: #2563eb; }}
    .hero p {{ color: #4a4a4a; }}
    .stat-card, .era-card, .method-card {{ border: 1px solid #e5e5e5; background: #fafafa; }}
    .scroll-indicator {{ display: none; }}
    section {{ page-break-inside: avoid; padding: 2rem 0; }}
    .chart-container {{ page-break-inside: avoid; }}
    .table-wrapper {{ page-break-inside: avoid; }}
    table {{ font-size: 0.75rem; }}
}}

@media (max-width: 768px) {{
    .hero h1 {{ font-size: 2rem; }}
    .hero-stats {{ flex-direction: column; align-items: center; }}
    .stat-grid {{ grid-template-columns: 1fr; }}
    .era-grid {{ grid-template-columns: 1fr; }}
    .chart-grid {{ grid-template-columns: 1fr; }}
    .method-grid {{ grid-template-columns: 1fr; }}
    .container {{ padding: 0 1rem; }}
}}
</style>
</head>
<body>

<!-- ═══════════════════ HERO ═══════════════════ -->
<div class="hero">
    <div class="hero-content">
        <div class="hero-badge">📊 Research Report — 2008 to 2025</div>
        <h1>IPL Auction Fees vs<br><span>On-Field Performance</span></h1>
        <p>
            Does the most expensive buy of each IPL season justify their price tag?
            A comprehensive data-driven study across 18 seasons of the Indian Premier League.
        </p>
        <div class="hero-stats">
            <div class="hero-stat">
                <div class="number">{total_seasons}</div>
                <div class="label">Seasons Analyzed</div>
            </div>
            <div class="hero-stat">
                <div class="number">{len(values):,}</div>
                <div class="label">Player-Seasons</div>
            </div>
            <div class="hero-stat">
                <div class="number">₹{awards['highest_buy_price_cr'].sum():.0f}Cr</div>
                <div class="label">Total Spent on Big Buys</div>
            </div>
            <div class="hero-stat">
                <div class="number">{hit_pct:.0f}%</div>
                <div class="label">Award Hit Rate</div>
            </div>
        </div>
    </div>
    <div class="scroll-indicator"><span></span></div>
</div>

<div class="container">

<!-- ═══════════════════ EXECUTIVE SUMMARY ═══════════════════ -->
<section>
    <div class="section-label">01 — Executive Summary</div>
    <h2 class="section-title">The Big Picture</h2>
    <p class="section-subtitle">Key findings from 18 years of IPL auction data and on-field performance metrics.</p>

    <div class="stat-grid">
        <div class="stat-card red">
            <div class="stat-value">{miss_count}/{total_seasons}</div>
            <div class="stat-label">Seasons Big Buy Missed All Awards</div>
            <div class="stat-detail">{100-hit_pct:.1f}% failure rate</div>
        </div>
        <div class="stat-card green">
            <div class="stat-value">{hit_count}/{total_seasons}</div>
            <div class="stat-label">Seasons Big Buy Won an Award</div>
            <div class="stat-detail">Only Ben Stokes (2017 MVP)</div>
        </div>
        <div class="stat-card orange">
            <div class="stat-value">₹{avg_price:.1f}Cr</div>
            <div class="stat-label">Average Big Buy Price</div>
            <div class="stat-detail">Range: ₹{min_price_row['highest_buy_price_cr']}Cr – ₹{max_price_row['highest_buy_price_cr']}Cr</div>
        </div>
        <div class="stat-card purple">
            <div class="stat-value">{orange_wins}+{purple_wins}+{mvp_wins}</div>
            <div class="stat-label">Orange + Purple + MVP Wins</div>
            <div class="stat-detail">Combined across all big buys</div>
        </div>
    </div>

    <div class="insight-box danger">
        <h4>🔴 Critical Finding</h4>
        <p>In <strong>94.4%</strong> of IPL seasons, the most expensive buy at auction failed to win any major individual award
        (Orange Cap, Purple Cap, or MVP). The only exception was <strong>Ben Stokes in 2017</strong>, who won MVP
        while playing for Rising Pune Supergiant after being bought for ₹14.5 Crore.</p>
    </div>

    <div class="insight-box warning">
        <h4>⚠️ Price Inflation, Not Performance Inflation</h4>
        <p>While average big-buy prices have doubled from <strong>₹{era_stats.loc['Early (2008–13)', 'avg_price']:.1f}Cr</strong> (Early era) to
        <strong>₹{era_stats.loc['Modern (2020–25)', 'avg_price']:.1f}Cr</strong> (Modern era), average run production has actually
        <strong>declined</strong> from {era_stats.loc['Early (2008–13)', 'avg_runs']:.0f} to {era_stats.loc['Modern (2020–25)', 'avg_runs']:.0f} runs.</p>
    </div>

    <div class="insight-box success">
        <h4>✅ Best Value for Money</h4>
        <p><strong>Kieron Pollard (2010)</strong> remains the best value big buy in IPL history with a value score of 109.0,
        purchased for just ₹4.8 Crore. He delivered incredible all-round performances that season.</p>
    </div>
</section>

<!-- ═══════════════════ CHART 1 & 2 ═══════════════════ -->
<section>
    <div class="section-label">02 — Visual Analysis</div>
    <h2 class="section-title">Price vs Performance</h2>
    <p class="section-subtitle">Scatter plot and timeline showing how big buys have performed relative to their auction price.</p>

    <div class="chart-container">
        <img src="data:image/png;base64,{chart1_b64}" alt="Chart 1: Price vs Performance Scatter">
        <div class="chart-caption">Figure 1 — Scatter plot of auction price vs runs scored. Green dots indicate award winners. Bubble size reflects price.</div>
    </div>

    <div class="chart-container">
        <img src="data:image/png;base64,{chart2_b64}" alt="Chart 2: Hit Rate by Season">
        <div class="chart-caption">Figure 2 — Season-by-season award success. Only 2017 (Ben Stokes) shows a hit. All other seasons are misses.</div>
    </div>
</section>

<!-- ═══════════════════ CHART 3 & 4 ═══════════════════ -->
<section>
    <div class="section-label">03 — Value & Era Analysis</div>
    <h2 class="section-title">Who Delivered the Best Return?</h2>
    <p class="section-subtitle">Value score leaderboard and era-wise trend analysis.</p>

    <div class="chart-container">
        <img src="data:image/png;base64,{chart3_b64}" alt="Chart 3: Value Leaderboard">
        <div class="chart-caption">Figure 3 — Value Score Leaderboard. Score is calculated as (Raw Performance Score / Auction Price in Crores).</div>
    </div>

    <div class="chart-container">
        <img src="data:image/png;base64,{chart4_b64}" alt="Chart 4: Era Analysis">
        <div class="chart-caption">Figure 4 — Three-era comparison: average price, runs, and award hit rate across Early, Middle, and Modern eras.</div>
    </div>
</section>

<!-- ═══════════════════ ERA DEEP DIVE ═══════════════════ -->
<section>
    <div class="section-label">04 — Era Breakdown</div>
    <h2 class="section-title">How the Trend Has Evolved</h2>
    <p class="section-subtitle">Comparing three distinct eras of IPL auctions.</p>

    <div class="era-grid">
        <div class="era-card early">
            <h3>⏳ Early Era (2008–13)</h3>
            <div class="era-stat">
                <span class="era-label">Seasons</span>
                <span class="era-value">{int(era_stats.loc['Early (2008–13)', 'seasons_count'])}</span>
            </div>
            <div class="era-stat">
                <span class="era-label">Avg Price</span>
                <span class="era-value">₹{era_stats.loc['Early (2008–13)', 'avg_price']:.1f}Cr</span>
            </div>
            <div class="era-stat">
                <span class="era-label">Avg Runs</span>
                <span class="era-value">{era_stats.loc['Early (2008–13)', 'avg_runs']:.0f}</span>
            </div>
            <div class="era-stat">
                <span class="era-label">Award Hit Rate</span>
                <span class="era-value">{era_stats.loc['Early (2008–13)', 'award_hit_pct']:.0f}%</span>
            </div>
        </div>
        <div class="era-card middle">
            <h3>📈 Middle Era (2014–19)</h3>
            <div class="era-stat">
                <span class="era-label">Seasons</span>
                <span class="era-value">{int(era_stats.loc['Middle (2014–19)', 'seasons_count'])}</span>
            </div>
            <div class="era-stat">
                <span class="era-label">Avg Price</span>
                <span class="era-value">₹{era_stats.loc['Middle (2014–19)', 'avg_price']:.1f}Cr</span>
            </div>
            <div class="era-stat">
                <span class="era-label">Avg Runs</span>
                <span class="era-value">{era_stats.loc['Middle (2014–19)', 'avg_runs']:.0f}</span>
            </div>
            <div class="era-stat">
                <span class="era-label">Award Hit Rate</span>
                <span class="era-value">{era_stats.loc['Middle (2014–19)', 'award_hit_pct']:.0f}%</span>
            </div>
        </div>
        <div class="era-card modern">
            <h3>🚀 Modern Era (2020–25)</h3>
            <div class="era-stat">
                <span class="era-label">Seasons</span>
                <span class="era-value">{int(era_stats.loc['Modern (2020–25)', 'seasons_count'])}</span>
            </div>
            <div class="era-stat">
                <span class="era-label">Avg Price</span>
                <span class="era-value">₹{era_stats.loc['Modern (2020–25)', 'avg_price']:.1f}Cr</span>
            </div>
            <div class="era-stat">
                <span class="era-label">Avg Runs</span>
                <span class="era-value">{era_stats.loc['Modern (2020–25)', 'avg_runs']:.0f}</span>
            </div>
            <div class="era-stat">
                <span class="era-label">Award Hit Rate</span>
                <span class="era-value">{era_stats.loc['Modern (2020–25)', 'award_hit_pct']:.0f}%</span>
            </div>
        </div>
    </div>

    <div class="insight-box finding">
        <h4>📊 Observation</h4>
        <p>Despite prices nearly doubling from the Early to Modern era, the average runs scored by big buys has
        <strong>decreased by ~7%</strong>. The award hit rate remains near zero across all eras, suggesting
        that paying top dollar at auction has <strong>never been a reliable strategy</strong> for securing award-winning performance.</p>
    </div>
</section>

<!-- ═══════════════════ SEASON TABLE ═══════════════════ -->
<section>
    <div class="section-label">05 — Season-by-Season Data</div>
    <h2 class="section-title">Every Big Buy: 2008–2025</h2>
    <p class="section-subtitle">Complete record of each season's most expensive acquisition and their on-field output.</p>

    <div class="table-wrapper">
        <table>
            <thead>
                <tr>
                    <th>Season</th>
                    <th>Player</th>
                    <th>Team</th>
                    <th>Price</th>
                    <th>Runs</th>
                    <th>SR</th>
                    <th>Wkts</th>
                    <th>Eco</th>
                    <th>Award?</th>
                </tr>
            </thead>
            <tbody>{season_rows}
            </tbody>
        </table>
    </div>
</section>

<!-- ═══════════════════ VALUE RANKINGS ═══════════════════ -->
<section>
    <div class="section-label">06 — Value Rankings</div>
    <h2 class="section-title">Best & Worst Value for Money</h2>
    <p class="section-subtitle">Value Score = Raw Performance Score ÷ Auction Price (₹ Crore). Higher is better.</p>

    <h3 style="font-family:'Outfit',sans-serif; font-size:1.3rem; font-weight:700; color:var(--accent-green); margin-bottom:1rem; margin-top:2rem;">
        🏆 Top 5 Best Value Big Buys
    </h3>
    <div class="table-wrapper">
        <table>
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Season</th>
                    <th>Price</th>
                    <th>Runs</th>
                    <th>Wickets</th>
                    <th>Value Score</th>
                </tr>
            </thead>
            <tbody>{best_rows}
            </tbody>
        </table>
    </div>

    <h3 style="font-family:'Outfit',sans-serif; font-size:1.3rem; font-weight:700; color:var(--accent-red); margin-bottom:1rem; margin-top:3rem;">
        📉 Top 5 Worst Value Big Buys
    </h3>
    <div class="table-wrapper">
        <table>
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Season</th>
                    <th>Price</th>
                    <th>Runs</th>
                    <th>Wickets</th>
                    <th>Value Score</th>
                </tr>
            </thead>
            <tbody>{worst_rows}
            </tbody>
        </table>
    </div>
</section>

<!-- ═══════════════════ TOP PERFORMERS ═══════════════════ -->
<section>
    <div class="section-label">07 — Best Performers Each Season</div>
    <h2 class="section-title">Who Actually Dominated?</h2>
    <p class="section-subtitle">The highest-performing player per season by raw score — often NOT the big buy.</p>

    <div class="table-wrapper">
        <table>
            <thead>
                <tr>
                    <th>Season</th>
                    <th>Top Performer</th>
                    <th>Runs</th>
                    <th>Wickets</th>
                    <th>Raw Score</th>
                </tr>
            </thead>
            <tbody>{top_perf_rows}
            </tbody>
        </table>
    </div>
</section>

<!-- ═══════════════════ AWARD WINNERS ═══════════════════ -->
<section>
    <div class="section-label">08 — Award Winners Reference</div>
    <h2 class="section-title">Official Award Winners (2008–2025)</h2>
    <p class="section-subtitle">Orange Cap, Purple Cap, and MVP winners for every season.</p>

    <div class="table-wrapper">
        <table>
            <thead>
                <tr>
                    <th>Season</th>
                    <th>🟠 Orange Cap</th>
                    <th>🟣 Purple Cap</th>
                    <th>🏅 MVP</th>
                </tr>
            </thead>
            <tbody>{award_rows}
            </tbody>
        </table>
    </div>
</section>

<!-- ═══════════════════ METHODOLOGY ═══════════════════ -->
<section>
    <div class="section-label">09 — Methodology</div>
    <h2 class="section-title">How This Study Was Conducted</h2>
    <p class="section-subtitle">A transparent overview of the data pipeline and scoring methodology.</p>

    <div class="method-grid">
        <div class="method-card">
            <div class="step-num">1</div>
            <h4>Data Collection</h4>
            <p>Ball-by-ball IPL match data (2008–2025) was sourced and the highest buy per season was manually curated with award winners.</p>
        </div>
        <div class="method-card">
            <div class="step-num">2</div>
            <h4>Aggregation</h4>
            <p>Batting stats (runs, SR, 4s, 6s) and bowling stats (wickets, economy) were aggregated per player per season.</p>
        </div>
        <div class="method-card">
            <div class="step-num">3</div>
            <h4>Name Matching</h4>
            <p>Fuzzy matching (surname-first + token sort ratio) was used to link award names with ball-by-ball data names.</p>
        </div>
        <div class="method-card">
            <div class="step-num">4</div>
            <h4>Scoring Formula</h4>
            <p><strong>Batting</strong>: Runs × (SR/100) if balls faced ≥ 50.<br>
            <strong>Bowling</strong>: Wickets × (8/Economy) if balls bowled ≥ 60.<br>
            <strong>Value Score</strong>: Raw Score ÷ Price (₹Cr).</p>
        </div>
    </div>

    <div class="insight-box finding">
        <h4>📝 Limitations</h4>
        <p>This study considers only the <strong>single most expensive buy</strong> each season. Some seasons had multiple high-value buys.
        The scoring formula is simplified and does not capture fielding contributions, captaincy value, or team context.
        IPL 2020 data may have gaps due to the COVID-affected season.</p>
    </div>
</section>

<!-- ═══════════════════ CONCLUSION ═══════════════════ -->
<div class="conclusion">
    <h2>Conclusion</h2>
    <p>
        Across 18 seasons and over <strong>₹{awards['highest_buy_price_cr'].sum():.0f} Crore</strong> spent on the biggest buys,
        the data tells a clear story: <strong>auction price does not predict award-winning performance</strong>.
    </p>
    <p>
        Only <strong>1 out of 18</strong> big buys went on to win a major individual award.
        As prices have escalated — from ₹9.5 Crore (MS Dhoni, 2008) to ₹27 Crore (Rishabh Pant, 2025) —
        performance returns have not kept pace. The IPL auction remains a fascinating marketplace where
        <strong>perceived value often diverges sharply from delivered value</strong>.
    </p>
    <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 2rem;">
        "In cricket, as in markets, the price you pay is not always the value you receive."
    </p>
</div>

</div>

<!-- ═══════════════════ FOOTER ═══════════════════ -->
<div class="footer">
    <p>IPL Auction Study Report — Generated on {now}</p>
    <p style="margin-top: 0.5rem;">Data pipeline: Python (pandas, matplotlib, seaborn, fuzzywuzzy) • 6-step automated analysis</p>
</div>

</body>
</html>"""

# ── Write HTML ─────────────────────────────────────────────────
with open(REPORT_HTML, "w", encoding="utf-8") as f:
    f.write(html)

print(f"OK: Presentation-ready HTML report generated!")
print(f"   -> {REPORT_HTML}")
print(f"   File size: {os.path.getsize(REPORT_HTML) / 1024:.0f} KB")
print(f"\n[INFO] Open in browser to view, or Print -> Save as PDF for a PDF version.")
