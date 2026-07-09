# 🏏 IPL Auction Intelligence Platform

A professional-grade, data-driven cricket analytics console designed to decode the intersection of **Auction Market Value** and **On-Field Performance**. The platform transforms over 18 years of IPL ball-by-ball statistics (2008–2025) into actionable scouting insights using advanced visualizations, explainability scoring, and a full franchise archive.

---

## 🚀 Key Features

### 1. 🏛️ Complete Franchise Archives (15 Teams)
A comprehensive historical record for all 15 IPL franchises, including defunct teams — **Deccan Chargers**, **Kochi Tuskers Kerala**, **Rising Pune Supergiant**, and **Gujarat Lions**.
- **Management Audit**: Historical coaching staff, mentors, and directors per franchise
- **Squad Intelligence**: Player roles, styles, and nationalities across all active and inactive seasons
- **Stadium Backgrounds**: Immersive team-specific wallpapers rendered as cinematic glassmorphism backdrops

### 2. 🌌 Market Galaxy (Auction ROI Maps)
A high-performance scatter plot mapping every player's **Auction Price** against their **Value Score**.
- **ROI Benchmarking**: Real-time performance-per-crore calculation
- **Star Highlighting**: Record-breaking signings highlighted to visualize budget impact

### 3. 🧠 Strategy IQ (Efficiency Index)
A team-level analytics engine ranking franchises by **Spending Efficiency**.
- **Bargain Detection**: Identifies teams that secure high-performance players at low prices
- **Budget Optimization**: Visualizes value derived per Rupee spent at auction

### 4. 📈 Performance Pulse (Trend Mapping)
Tracks player trajectories across multiple seasons for career-peak and slump detection.

### 5. 🔍 Interactive Scouting Console
A dynamic filtering console for auction strategy and squad planning.
- Role-based filtering (Batter, Bowler, All-Rounder, Wicket-Keeper)
- XAI-powered player labels: **Power Finisher**, **Control Bowler**, **Wicket Hunter**, **Reliable Rotator**, **Technical Anchor**
- Explainability scores derived from batting strike rates, bowling economy, and consistency metrics

### 6. 📊 Historical Points Table
Season-by-season standings for all IPL editions (2008–2025).
- Custom animated season dropdown (glassmorphism UI)
- Trophy icons for champions
- Win/loss trend data per team per season

### 7. ⚡ JSON-Driven Static Architecture
Optimized for high-speed delivery on **Vercel** with sub-second load times.
- Pre-processed JSON bundles replace runtime Python queries
- Unified cross-module data schema

---

## 🐍 Python Analytics Pipeline

All aggregated data powering the platform was computed using a custom Python analytics pipeline located in `analytics/`.

| Script | Output |
|---|---|
| `generate_aggregates.py` | `batting_agg.csv`, `bowling_agg.csv` — season-wise player stats |
| `player_value_score.py` | `player_value_scores.csv` — composite auction value scores |
| `generate_xai.py` | `player_explainability.json`, `team_explainability.json`, `auction_explainability.json` |

**Run order:**
```bash
python analytics/generate_aggregates.py
python analytics/player_value_score.py
python analytics/generate_xai.py
```

**Requires:** `deliveries.csv` (IPL ball-by-ball dataset) placed in the `analytics/` folder.

**Key metrics computed:**
- Strike rate, batting average, economy rate, dismissal patterns per player per season
- Composite value score = `runs × weight + SR × weight + 4s/6s bonuses + bowling bonus`
- ROI efficiency = `value_score / auction_price_cr`
- XAI labels based on % deviation from league averages

---

## 🛠️ Technology Stack

| Layer | Tools |
|---|---|
| **Frontend** | JavaScript, Vanilla CSS, HTML |
| **Visualizations** | Chart.js 4.4.2 |
| **Data Analytics** | Python, Pandas, NumPy |
| **Data Format** | JSON bundles, CSV |
| **Build & Deploy** | Vite + Vercel (Clean-URL routing) |
| **UI Style** | Glassmorphism, dark mode, cinematic backgrounds |

---

## 📁 Project Structure

```
ipl-player-project/
├── analytics/                    # Python data pipeline
│   ├── generate_aggregates.py
│   ├── player_value_score.py
│   └── generate_xai.py
├── ipl-auction-study/            # Main web application
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── teams-page.js
│   ├── squad-list.js
│   ├── points-table.html
│   └── public/data/
│       ├── processed/            # CSV outputs from analytics pipeline
│       └── xai/                  # Explainability JSON files
└── react/                        # React component experiments
```

---

**Built by W V P S SRIRAJ**  
*Data-driven cricket analytics · IPL Auction Intelligence · 2025*
