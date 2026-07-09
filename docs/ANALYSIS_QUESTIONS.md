# 10 Analysis Questions — IPL Auction Intelligence

## Q1. Which players deliver the highest auction ROI?
**Hypothesis:** Players signed for ₹50L–₹1.5Cr deliver disproportionately higher value scores than ₹5Cr+ signings.
**Method:** Compute `value_score = raw_score / price_cr`. Rank descending, filter by ≥5 matches.
**Output:** Top 10 value players by season, ROI distribution chart.

---

## Q2. Do uncapped players outperform capped ones on value-per-crore?
**Hypothesis:** Uncapped players in their first 2 IPL seasons show significantly higher value_score than capped players at similar price brackets.
**Method:** Tag capped/uncapped. Compare median value_score at matched price bands (₹0–1Cr, ₹1–3Cr, ₹3Cr+).
**Output:** Box plot comparison by cap status and price bracket.

---

## Q3. Which player archetypes are systematically underpriced?
**Hypothesis:** "Control Bowlers" are underpriced because franchises overvalue wicket-takers and undervalue economy.
**Method:** Cross-reference XAI archetypes with price data. Calculate avg price vs avg raw_score per archetype.
**Output:** Table of avg price vs avg score per archetype.

---

## Q4. How does a franchise's auction strategy correlate with league position?
**Hypothesis:** Higher team-level value_score → better league finish.
**Method:** Aggregate value_score by team per season. Correlate with win rate via Pearson correlation.
**Output:** Scatter plot (team avg value score vs win %) with r-value.

---

## Q5. Is there a statistically significant correlation between bid price and performance?
**Hypothesis:** Weak-to-no positive correlation between auction price and performance.
**Method:** Spearman rank correlation between `price_cr` and `raw_score` across all priced players.
**Output:** Correlation matrix, scatter with trend line.

---

## Q6. Which seasons showed the highest market inefficiency?
**Hypothesis:** Early seasons (2008–2012) had higher inefficiency as teams hadn't refined strategies.
**Method:** Calculate season-level average value_score normalized by total season spend.
**Output:** Time series of "auction efficiency index" by season.

---

## Q7. Do bowlers or batters represent better auction value historically?
**Hypothesis:** Bowlers represent better value — consistently underpriced relative to impact.
**Method:** Separate by primary role, compare avg value_score per role, control for price bracket.
**Output:** Bar chart of avg value score by role, segmented by price bucket.

---

## Q8. What metrics best predict a player becoming a "big buy" next season?
**Hypothesis:** High SR growth + low economy + early career stage predicts next season's big buy.
**Method:** Use `is_big_buy` flag. Feature importance analysis on Season N stats to predict Season N+1 flag.
**Output:** Feature importance chart, precision-recall for prediction model.

---

## Q9. How does team composition affect win rate?
**Hypothesis:** Teams with balanced SR (above avg batting) and economy (below avg bowling) win more.
**Method:** Use XAI team labels. Cross-reference with match win data. Calculate win rate per style label.
**Output:** Grouped bar chart: win rate by team style label.

---

## Q10. Which franchises have shown the best auction intelligence over 16 seasons?
**Hypothesis:** CSK and MI rank highest in cumulative auction intelligence due to consistent title runs.
**Method:** Per-franchise multi-season "auction intelligence score" = avg team value_score weighted by spend. Rank all franchises.
**Output:** Ranked table with title correlation.
