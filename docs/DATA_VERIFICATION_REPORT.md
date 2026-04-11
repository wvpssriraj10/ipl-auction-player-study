# IPL Player Project — Data Verification Report
**Generated:** March 30, 2026  
**Project:** IPL Auction Study (2008–2025)

---

## I. Data Overview

Your project contains three main data layers:

| Data Type | File | Records | Coverage | Criticality |
|-----------|------|---------|----------|-------------|
| **Ball-by-Ball** | `all_ipl_matches_from_json.csv` | ~500K+ balls | 2008–Beyond | HIGH |
| **Batting Aggregates** | `data/processed/batting_agg.csv` | ~2K+ players | Multiple seasons | MEDIUM |
| **Bowling Aggregates** | `data/processed/bowling_agg.csv` | ~1K+ players | Multiple seasons | MEDIUM |
| **Awards & Prices** | `data/processed/ipl_awards_prices.csv` | 18 records | 2008–2025 | **CRITICAL** |
| **Player Value Scores** | `data/processed/player_value_scores.csv` | ~3K records | Computed | MEDIUM |

---

## II. Critical Data: Awards & Auction Prices (HARDCODED)

Source: `scripts/step1_create_awards.py`

This data is **HARDCODED** and **MUST** be verified against official sources:

### Records Requiring Verification:

| Season | Player | Auction Price (₹Cr) | Team | Orange Cap | Purple Cap | MVP | Notes |
|--------|--------|---------------------|------|-----------|-----------|-----|-------|
| 2008 | MS Dhoni | 9.50 | CSK | Shaun Marsh | Sohail Tanvir | Shane Watson | ✓ VERIFY |
| 2009 | Kevin Pietersen | 9.80 | RCB | Matthew Hayden | RP Singh | Adam Gilchrist | ✓ VERIFY |
| 2010 | Kieron Pollard | 4.80 | MI | Sachin Tendulkar | Pragyan Ojha | Sachin Tendulkar | ✓ VERIFY |
| 2011 | Gautam Gambhir | 14.90 | KKR | Chris Gayle | Lasith Malinga | Chris Gayle | ✓ VERIFY |
| 2012 | Ravindra Jadeja | 12.80 | CSK | Chris Gayle | Morne Morkel | Sunil Narine | ✓ VERIFY |
| 2013 | Glenn Maxwell | 6.30 | MI | Michael Hussey | Dwayne Bravo | Shane Watson | ✓ VERIFY |
| 2014 | Yuvraj Singh | 14.00 | RCB | Robin Uthappa | Mohit Sharma | Glenn Maxwell | ✓ VERIFY |
| 2015 | Yuvraj Singh | 16.00 | DD | David Warner | Dwayne Bravo | Andre Russell | ✓ VERIFY |
| 2016 | Shane Watson | 9.50 | RCB | Virat Kohli | Bhuvneshwar Kumar | Virat Kohli | ✓ VERIFY |
| 2017 | Ben Stokes | 14.50 | RPS | David Warner | Bhuvneshwar Kumar | Ben Stokes | ✓ VERIFY |
| 2018 | Ben Stokes | 12.50 | RR | Kane Williamson | Andrew Tye | Sunil Narine | ✓ VERIFY |
| 2019 | Jaydev Unadkat | 8.40 | RR | David Warner | Imran Tahir | Andre Russell | ✓ VERIFY |
| 2020 | Pat Cummins | 15.50 | KKR | KL Rahul | Kagiso Rabada | Jofra Archer | ✓ VERIFY |
| 2021 | Chris Morris | 16.25 | RR | Ruturaj Gaikwad | Harshal Patel | Harshal Patel | ✓ VERIFY |
| 2022 | Ishan Kishan | 15.25 | MI | Jos Buttler | Yuzvendra Chahal | Jos Buttler | ✓ VERIFY |
| 2023 | Sam Curran | 18.50 | PBKS | Shubman Gill | Mohammed Shami | Shubman Gill | ✓ VERIFY |
| 2024 | Mitchell Starc | 24.75 | KKR | Virat Kohli | Harshal Patel | Sunil Narine | ✓ VERIFY |
| 2025 | Rishabh Pant | 27.00 | LSG | Sai Sudharsan | Prasidh Krishna | Suryakumar Yadav | ✓ VERIFY |

---

## III. Verification Checklist

### A. Auction Price Verification

**External Sources:**
- **ESPN Cricinfo** — https://www.espncricinfo.com/series/ipl-2024
- **Cricbuzz** — https://www.cricbuzz.com/cricket-series/ipl-auction
- **Official IPL Website** — https://www.iplt20.com (Archives)

**Steps to Verify Price Data:**
1. Visit EPNCricinfo or Cricbuzz IPL auction pages
2. For each season (2008-2025), find the "Highest Buy" or "Most Expensive Player"
3. Document the original price in Rupees (₹ Crores)
4. Compare with hardcoded values in `step1_create_awards.py`
5. Flag any discrepancies

**Sample Key Records (Priority):**
- [ ] 2020 Pat Cummins vs 2024 Mitchell Starc vs 2025 Rishabh Pant (Price progression)
- [ ] 2021 Chris Morris (₹16.25 Cr) — Verify if highest buy that year
- [ ] 2010 Kieron Pollard (₹4.80 Cr) — Verify if correct for 2010

---

### B. Award Winners Verification (Orange Cap, Purple Cap, MVP)

**External Sources:**
- **ESPN Cricinfo** — Season-by-season archive pages
- **Cricbuzz** — Award winners for each IPL season
- **Official IPL Awards** — https://www.iplt20.com/awards

**Awards to Verify:**

**Orange Cap (Highest Run-Scorer):**
- [ ] Check batting_agg.csv — Does top scorer match award record?
- [ ] Validate for 2008, 2012, 2019, 2024, 2025

**Purple Cap (Highest Wicket-Taker):**
- [ ] Check bowling_agg.csv — Does top bowler match award record?
- [ ] Validate for 2008, 2015, 2020, 2023, 2024

**MVP/Man of the Match (Series MVP):**
- [ ] Verify against official IPL records
- [ ] Compare with player_value_scores.csv top performers

---

### C. Ball-by-Ball Data Verification

**Data Source:** `all_ipl_matches_from_json.csv`

**Verification Method:**

1. **Sample Match Verification:**
   - Pick 5 random matches from different seasons
   - Example: Match 1082591 (2017-04-05) — SRH vs RCB
   - Verify on ESPN Cricinfo live scorecard

2. **Check Points:**
   - [ ] Batting team vs Bowling team (correct?)
   - [ ] Players names (spellings match official records?)
   - [ ] Runs per ball (calculation correct?)
   - [ ] Wicket dismissals (type and timing correct?)

3. **Sample Records from Data:**
   - SRH vs RCB on 2017-04-05
   - DA Warner: 4, 0, 6, 0, 1 (as seen in data)
   - Cross-check with official scorecard

---

### D. Aggregated Statistics Verification

**File:** `batting_agg.csv` and `bowling_agg.csv`

**Verification Steps:**

1. **Pick a Notable Player (e.g., Chris Gayle - 2011, 2012, 2013):**
   ```
   Verify from CSV:
   - Total Runs across all seasons
   - Strike Rate calculation
   - Fours and Sixes count
   ```

2. **Cross-Reference:**
   - ESPN Cricket Stats: https://stats.espncricinfo.com
   - Cricbuzz Player Stats
   - Official IPL statistics page

3. **Sample Players to Check:**
   - [ ] Chris Gayle (2011: 733 runs - verify strike rate 160.75%)
   - [ ] Virat Kohli (2016: 973 runs - verify 152.03% strike rate)
   - [ ] David Warner (2016: 848 runs - verify stats)

---

## IV. Current Data Quality Assessment

### ✓ Strengths:
- Ball-by-ball data is granular and detailed
- Player aggregates correlate with match-level data
- Clear pipeline: raw → processed → scored
- 18 seasons of comprehensive coverage (2008–2025)

### ⚠ Potential Issues:
1. **Hardcoded Awards Data** — No automatic validation
   - CRITICAL: These 18 records are manually entered
   - High risk of typos or outdated information
   - **Recommendation: Verify all 18 records against official sources**

2. **Player Name Consistency** — Fuzzy matching used
   - File: `_fuzzy_results.txt` and `_test_fuzzy.py`
   - Some names may have multiple spellings
   - Example: "AB de Villiers" vs "AB Devilliers"

3. **Pricing Data** — Only highest buy recorded
   - No record of runner-up prices
   - No auction-round data
   - Limited for detailed auction analysis

4. **Missing Data** — Some older records (2008–2010) may be incomplete
   - Ball-by-ball data for early seasons may have gaps
   - Verify availability for seasons 2008–2010

---

## V. Quick Verification Guide

### **For Awards & Prices (MOST CRITICAL):**

```
1. Go to: https://www.espncricinfo.com/ci/content/story/index.html?object=1109
2. Search for "IPL Auctions" year by year
3. Find "Highest Buy" price for each season
4. Compare with step1_create_awards.py
5. Document any differences
```

### **For Individual Award Winners:**

```
Example for 2024 Orange Cap:
→ ESPN Cricinfo IPL 2024 stats page
→ Find "Orange Cap" winner
→ Should be Virat Kohli (if data is correct)
```

### **For Batting Aggregates:**

```
Example for Chris Gayle 2011:
→ Check ESPN Cricket Stats: Chris Gayle 2011
→ Verify: 733 runs, 59 sixes, 160.75% strike rate
→ Cross-check against CSV: batting_agg.csv
```

---

## VI. Recommended Actions

### Phase 1 (Immediate - Next 2 hours):
- [ ] Verify all 18 hardcoded auction prices
- [ ] Check award winners against official IPL records
- [ ] Document any discrepancies in `VERIFICATION_FINDINGS.txt`

### Phase 2 (Next 1-2 days):
- [ ] Spot-check 10 random bat-by-ball matches
- [ ] Validate top 20 player statistics
- [ ] Verify player name spellings

### Phase 3 (Ongoing):
- [ ] Create automated validation scripts
- [ ] Set up periodic checks against live data
- [ ] Build confidence intervals for statistics

---

## VII. Files to Review

| File | Purpose | Check Status |
|------|---------|--------------|
| `scripts/step1_create_awards.py` | Hardcoded awards—MANUAL ENTRY | ⚠ NEEDS VERIFICATION |
| `data/raw/ipl_matches.csv` | Raw ball-by-ball data | ⚠ SPOT CHECK |
| `data/processed/batting_agg.csv` | Computed aggregates | ✓ Likely valid if raw data is |
| `data/processed/bowling_agg.csv` | Computed aggregates | ✓ Likely valid if raw data is |
| `_fuzzy_results.txt` | Name matching log | Review for issues |

---

## VIII. Notes

- **Data Origin:** Ball-by-ball data appears to be from JSON (mentioned in filename)
- **Processing:** Data is aggregated properly via pandas calculations
- **Validation Status:** Aggregates are **DERIVED**, so they're only as good as source data
- **Awards Data:** **HARDCODED** — Highest risk area for errors

---

## Next Steps:

1. **Start with the verification checklist above**
2. **Use the external sources to cross-check**
3. **Document findings in a new file:** `VERIFICATION_FINDINGS.txt`
4. **Update hardcoded values if discrepancies found**

**Would you like me to help verify specific records or create an automated verification script?**

