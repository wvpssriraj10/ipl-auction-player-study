"""
Step 1 — Create the IPL Awards & Prices reference CSV.
"""
import os
import pandas as pd

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

# ── Award data ──────────────────────────────────────────────────
data = [
    (2008, "MS Dhoni",          9.50,  "CSK",  "Shaun Marsh",       "Sohail Tanvir",      "Shane Watson"),
    (2009, "Kevin Pietersen",   9.80,  "RCB",  "Matthew Hayden",    "RP Singh",            "Adam Gilchrist"),
    (2010, "Kieron Pollard",    4.80,  "MI",   "Sachin Tendulkar",  "Pragyan Ojha",        "Sachin Tendulkar"),
    (2011, "Gautam Gambhir",   14.90,  "KKR",  "Chris Gayle",       "Lasith Malinga",      "Chris Gayle"),
    (2012, "Ravindra Jadeja",  12.80,  "CSK",  "Chris Gayle",       "Morne Morkel",        "Sunil Narine"),
    (2013, "Glenn Maxwell",     6.30,  "MI",   "Michael Hussey",    "Dwayne Bravo",        "Shane Watson"),
    (2014, "Yuvraj Singh",     14.00,  "RCB",  "Robin Uthappa",     "Mohit Sharma",        "Glenn Maxwell"),
    (2015, "Yuvraj Singh",     16.00,  "DD",   "David Warner",      "Dwayne Bravo",        "Andre Russell"),
    (2016, "Shane Watson",      9.50,  "RCB",  "Virat Kohli",       "Bhuvneshwar Kumar",   "Virat Kohli"),
    (2017, "Ben Stokes",       14.50,  "RPS",  "David Warner",      "Bhuvneshwar Kumar",   "Ben Stokes"),
    (2018, "Ben Stokes",       12.50,  "RR",   "Kane Williamson",   "Andrew Tye",          "Sunil Narine"),
    (2019, "Jaydev Unadkat",    8.40,  "RR",   "David Warner",      "Imran Tahir",         "Andre Russell"),
    (2020, "Pat Cummins",      15.50,  "KKR",  "KL Rahul",          "Kagiso Rabada",       "Jofra Archer"),
    (2021, "Chris Morris",     16.25,  "RR",   "Ruturaj Gaikwad",   "Harshal Patel",       "Harshal Patel"),
    (2022, "Ishan Kishan",    15.25,  "MI",   "Jos Buttler",       "Yuzvendra Chahal",    "Jos Buttler"),
    (2023, "Sam Curran",       18.50,  "PBKS", "Shubman Gill",      "Mohammed Shami",      "Shubman Gill"),
    (2024, "Mitchell Starc",   24.75,  "KKR",  "Virat Kohli",       "Harshal Patel",       "Sunil Narine"),
    (2025, "Rishabh Pant",     27.00,  "LSG",  "Sai Sudharsan",     "Prasidh Krishna",     "Suryakumar Yadav"),
]

cols = ["season", "highest_buy_player", "highest_buy_price_cr",
        "highest_buy_team", "orange_cap", "purple_cap", "mvp"]

df = pd.DataFrame(data, columns=cols)
df.to_csv(AWARDS_CSV, index=False)

print(df.to_string(index=False))
print(f"\nStep 1 complete — ipl_awards_prices.csv saved to /data/processed/")
