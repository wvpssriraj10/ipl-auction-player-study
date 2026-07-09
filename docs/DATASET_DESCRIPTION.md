# 📦 Dataset Description — IPL Auction Intelligence

## Overview

This project operates on two primary data sources that are combined through a Python pipeline to produce analysis-ready CSVs served directly to the frontend dashboard.

---

## Source 1: Ball-by-Ball Deliveries (`deliveries.csv`)

| Property | Detail |
|---|---|
| **Origin** | Kaggle — IPL Complete Dataset |
| **Coverage** | IPL Seasons 2008–2024 |
| **Granularity** | Every ball bowled in every IPL match |
| **Approximate Rows** | ~800,000+ |
| **Format** | CSV |

### Key Columns

| Column | Type | Description |
|---|---|---|
| `match_id` | int | Unique match identifier |
| `season` | int | IPL season year (2008–2024) |
| `batting_team` | str | Name of the batting team |
| `bowling_team` | str | Name of the bowling team |
| `batter` | str | Name of the batter facing the ball |
| `bowler` | str | Name of the bowler delivering the ball |
| `batsman_runs` | int | Runs scored off the bat (0–6) |
| `extra_runs` | int | Extras (wides, no-balls, byes) |
| `total_runs` | int | Total runs on that delivery |
| `wide_runs` | int | Wide runs (0 or 1) |
| `noball_runs` | int | No-ball runs (0 or 1) |
| `is_wicket` | int | 1 if a wicket fell, 0 otherwise |
| `dismissal_kind` | str | How the batter was dismissed |
| `player_dismissed` | str | Name of the player dismissed |
| `ball` | float | Ball number in the over |

### Data Quality Notes
- Team name inconsistencies handled via normalization map (e.g., `Delhi Daredevils` → `Delhi Capitals`)
- Pre-2013 data has occasional missing `dismissal_kind` values
- Wide deliveries are excluded from balls-faced counts in bowling stats

---

## Source 2: Awards & Auction Prices (`ipl_awards_prices.csv`)

| Property | Detail |
|---|---|
| **Origin** | Manually curated from official IPL records |
| **Coverage** | IPL Seasons 2008–2024 |
| **Granularity** | One row per season |
| **Format** | CSV |

### Columns

| Column | Type | Description |
|---|---|---|
| `season` | int | IPL season year |
| `highest_buy_player` | str | Player who received the highest auction bid |
| `highest_buy_price_cr` | float | Auction price in Crores (₹) |
| `player_of_tournament` | str | Tournament's best player award winner |

### Limitations
- Only the **highest bid per season** is tracked — mid-tier pricing is not captured
- Some early seasons (pre-2011) have incomplete price records

---

## Processed Output Files

All processed files live in `public/data/processed/` and are served directly to the frontend.

### `batting_agg.csv`

Season-level batting aggregates per player.

| Column | Description |
|---|---|
| `season` | IPL season year |
| `player` | Batter name |
| `team` | Team played for |
| `total_runs` | Total runs scored |
| `fours` | Number of fours hit |
| `sixes` | Number of sixes hit |
| `balls_faced` | Total balls faced |
| `matches` | Matches played |
| `innings` | Innings played |
| `outs` | Number of dismissals |
| `strike_rate` | Runs per 100 balls |
| `batting_average` | Runs per dismissal |

### `bowling_agg.csv`

Season-level bowling aggregates per player.

| Column | Description |
|---|---|
| `season` | IPL season year |
| `player` | Bowler name |
| `team` | Team played for |
| `wickets` | Wickets taken (legal dismissals only) |
| `runs_conceded` | Runs given (excl. wides & no-balls) |
| `balls_bowled` | Legal balls bowled |
| `dot_balls` | Deliveries where 0 runs were scored |
| `matches_bowled` | Matches where the player bowled |
| `economy` | Runs per over |
| `bowling_average` | Runs per wicket |
| `bowling_strike_rate` | Balls per wicket |

### `player_value_scores.csv`

Composite value score per player per season.

| Column | Description |
|---|---|
| `player` | Player name |
| `season` | IPL season year |
| `raw_score` | Composite performance score (batting + bowling) |
| `price_cr` | Auction price in Crores (if known) |
| `value_score` | raw_score / price_cr (auction ROI) |
| `is_big_buy` | Boolean — was this the season's highest bid? |

### XAI JSONs (`public/data/xai/`)

| File | Content |
|---|---|
| `player_explainability.json` | Per-player: archetype label, reasoning string, confidence level |
| `team_explainability.json` | Per-team: style label (Batting Aggressive, Bowling Dominant, Balanced) |
| `auction_explainability.json` | Per-auction-entry: High Value / Fair Value / Overpriced label |

---

## Data Pipeline Flow

```
deliveries.csv
      │
      ▼
generate_aggregates.py
      │
      ├──► batting_agg.csv
      └──► bowling_agg.csv
                │
                ▼
      player_value_score.py  ◄── ipl_awards_prices.csv
                │
                └──► player_value_scores.csv
                           │
                           ▼
                   generate_xai.py
                           │
                           ├──► player_explainability.json
                           ├──► team_explainability.json
                           └──► auction_explainability.json
```

---

## Assumptions & Caveats

1. A "wicket" is counted only for bowler-credited dismissals (bowled, caught, LBW, stumped, hit wicket, caught & bowled). Run-outs are excluded.
2. Economy rate is calculated on legal balls only (wides excluded).
3. Batting average for players with 0 dismissals defaults to total runs (not ∞).
4. All historical team name variants are normalized to 2024 team names for consistency.
5. Auction prices are only available for "highest buy" players per season — all other players' value scores reflect raw performance only.