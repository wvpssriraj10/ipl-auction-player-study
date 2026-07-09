# ⚠️ Limitations — IPL Auction Intelligence

An honest accounting of what this analysis can and cannot claim.

---

## 1. Incomplete Auction Price Coverage

**What's missing:** Auction price data is only captured for the **highest bid player per season** via `ipl_awards_prices.csv`. The vast majority of players — including all players sold at base price or mid-tier prices — have no `price_cr` value.

**Impact:** The `value_score` (ROI metric) is only computable for a small subset of player-seasons. Insights about "which players are overpriced" or "uncapped vs capped ROI" are drawn from this limited sample and may not generalize to the full auction market.

**Mitigation needed:** A full auction results dataset (all players, all prices, all seasons) would unlock dramatically more reliable insights. Sources like ESPNcricinfo auction archives could fill this gap.

---

## 2. Context Blindness — No Opposition or Pitch Adjustment

**What's missing:** The model treats all runs and wickets equally regardless of:
- The quality of the bowling/batting opposition
- The venue (Wankhede vs Chepauk vs Eden Gardens play very differently)
- The match situation (chasing 200 in the last 5 overs vs comfortable win)

**Impact:** A player who scores 400 runs against weak bowling attacks at a flat pitch may score higher than a player who scores 300 runs in difficult conditions against elite bowling. The raw score doesn't distinguish.

**Mitigation needed:** Opposition quality index + venue-adjusted run/economy rates.

---

## 3. Batting Position Blindness

**What's missing:** A player batting at #3 and a player batting at #8 receive identical treatment. An opener has far more balls to face and naturally accumulates higher raw scores.

**Impact:** Finishers (positions 6–8) are systematically underrated relative to their actual match impact. A 25-ball 40 at #7 is often more match-winning than a 40-ball 40 at #3.

**Mitigation needed:** Position-specific weights or normalized "contribution index" per batting position.

---

## 4. Injury and Availability Not Modelled

**What's missing:** Players who missed partial or full seasons due to injury appear to underperform — but were simply unavailable.

**Impact:** Multi-season value scores for injury-prone players are deflated. A player with 3 brilliant seasons and 2 injury-affected seasons looks "medium value" when they're actually elite.

**Mitigation needed:** Availability/fitness flag per season to exclude injury-affected seasons from long-term averages.

---

## 5. All-Rounder Double-Counting

**What's missing:** The model adds batting score and bowling bonus independently. For genuine all-rounders (Hardik Pandya, Ravindra Jadeja type), both components are substantial, inflating their composite score relative to pure batters or pure bowlers.

**Impact:** All-rounders appear disproportionately valuable in the raw score ranking, which may misrepresent the comparative value of specialists.

**Mitigation needed:** Role-based cap on contribution — e.g., only count the higher of batting or bowling contribution for players who contribute significantly in both.

---

## 6. T20 Era Evolution Not Accounted For

**What's missing:** A strike rate of 130 in 2008 was exceptional; in 2024 it's below average. The model uses all-time league averages for archetype classification, which means early-era players are classified against modern benchmarks.

**Impact:** Players from 2008–2013 will be classified as "Reliable Rotator" more often than they should be, as T20 standards have evolved dramatically.

**Mitigation needed:** Era-adjusted league averages — compute league avg SR/economy per season, not all-time.

---

## 7. Team Strategy ≠ Auction Intelligence

**What's missing:** Team XAI labels (Batting Aggressive, Bowling Dominant, etc.) reflect aggregate player statistics — not actual coaching philosophy, team selection decisions, or scouting intelligence.

**Impact:** A team labelled "Batting Aggressive" may simply have had talented batters available — not necessarily a deliberate aggressive strategy. The label is a description of outcome, not intent.

**Mitigation needed:** This limitation is inherent; acknowledge it when presenting team-level insights.
