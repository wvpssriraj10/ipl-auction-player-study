# 🧠 Player Scouting Logic — IPL Auction Intelligence

## Overview

The scouting engine operates in 3 layers: **performance scoring**, **archetype classification**, and **auction ROI labelling**. Together they answer the question a franchise analyst actually asks: *"Is this player worth what we're about to bid?"*

---

## Layer 1 — Raw Performance Score

Every player-season gets a single composite number:

```
raw_score = (total_runs × 1.0)
          + (strike_rate × 0.4)
          + (fours × 2.0)
          + (sixes × 6.0)
          + bowling_bonus
```

**Weight rationale:**
- `total_runs × 1.0` — base batting contribution
- `strike_rate × 0.4` — T20 tempo premium; a player scoring 500 runs at SR 180 is far more valuable than 500 at SR 110
- `fours × 2.0` — boundary hitting indicates timing and control
- `sixes × 6.0` — six-hitting is the most match-defining act in T20; premium weighted accordingly

**Bowling Bonus:**
```python
bowling_bonus = wickets × 20
if economy < 8.0:
    bonus *= (1 + (8 - economy) / 8)
```

Economy threshold of 8.0 = approximate IPL average. A bowler with 10 wickets at economy 6.0 earns:
`10 × 20 × (1 + (8−6)/8) = 200 × 1.25 = 250 bonus points`

vs. same wickets at economy 9.0:
`10 × 20 × 1.0 = 200` (no bonus, no penalty at or slightly above threshold)

---

## Layer 2 — XAI Archetype Classification

Each player is benchmarked against **league-wide averages** (not fixed thresholds):

```
league_avg_sr  ≈ 127 (varies by era)
league_avg_avg ≈ 24
league_avg_eco ≈ 8.1
```

| Archetype | Trigger Condition | What it Means |
|---|---|---|
| **Power Finisher** | SR ≥ 20% above league avg | Explosive hitter — premium T20 asset |
| **Technical Anchor** | Batting avg ≥ 30% above league avg | Consistent scorer, anchors innings |
| **Control Bowler** | Economy ≤ 10% below avg OR wickets > 5 | Restricts runs, death-over specialist |
| **Wicket Hunter** | Economy ≥ 10% above avg | Attacks aggressively, concedes runs but gets wickets |
| **Reliable Rotator** | Near league avg on all metrics | Consistent contributor, no standout trait |

**Confidence levels:**
- `High`: Trigger exceeds 2× the threshold (e.g., SR 30%+ above avg for Power Finisher)
- `Medium`: Between 1× and 2× threshold
- `Low`: Just clears the minimum

---

## Layer 3 — Auction ROI Label

For players with known auction prices:

```
roi_ratio = raw_score / price_cr / avg_league_roi

if roi_ratio >= 1.5:  → "High Value"
elif roi_ratio >= 0.8: → "Fair Value"
else:                  → "Overpriced"
```

This is the key scouting signal. A player labelled **High Value** at ₹1 Cr delivers the same or better output than the average player at ₹1.5 Cr+.

---

## How a Franchise Would Use This

### Pre-Auction Shortlisting
1. Filter by desired archetype (e.g., "Power Finisher" with High confidence)
2. Sort by `value_score` descending
3. Cross-reference with `is_big_buy` — if they've been a record buy before, adjust bid strategy
4. Set max bid = historical avg price for that archetype × 1.2 (20% premium ceiling)

### Post-Auction Review
1. For each player signed, check their ROI label
2. If "Overpriced" — flag for performance monitoring; consider not retaining
3. If "High Value" — prioritize retention at next auction

### Squad Gap Analysis
1. Identify which archetypes are missing in your current squad
2. The XAI team label tells you if your team is "Batting Aggressive" or "Bowling Dominant"
3. Draft strategy: if you're Batting Aggressive, target Control Bowlers to balance

---

## Limitations of the Scouting Model

- **No positional awareness** — A batter at #3 and #8 get identical treatment
- **No opposition adjustment** — 50 against MI attack ≠ 50 against PBKS attack
- **No pitch/ground factor** — Wankhede scores inflate SR metrics
- **Static league averages** — Comparing 2008 SR to 2024 SR ignores T20 evolution
- **No fitness/injury data** — Can't predict availability

---

## Future Improvements

1. **Era-adjusted metrics** — Normalize SR and economy by season average, not all-time
2. **Positional weights** — Batting position multiplier (openers get SR premium, finishers get boundary premium)
3. **Opposition quality index** — Weight performances against top-5 bowling attacks higher
4. **Retention value decay** — Model how fast player value declines post-peak (age curves)
5. **Form factor** — Weight last 2 seasons more heavily than career average
