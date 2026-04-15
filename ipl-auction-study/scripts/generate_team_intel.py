import pandas as pd
import json
import os
import numpy as np

# Paths
INPUT_DIR = "data/processed"
POINTS_TABLE_PATH = "public/data/ipl-points-table.json"
TEAMS_BUNDLE_PATH = "public/data/ipl-teams-bundle.json"
OUTPUT_PATH = "public/data/ipl-teams-bundle.json"

ACRONYM_TO_FULL = {
    "CSK": "Chennai Super Kings",
    "MI": "Mumbai Indians",
    "RCB": "Royal Challengers Bengaluru",
    "KKR": "Kolkata Knight Riders",
    "SRH": "Sunrisers Hyderabad",
    "DC": "Delhi Capitals",
    "PBKS": "Punjab Kings",
    "RR": "Rajasthan Royals",
    "GT": "Gujarat Titans",
    "LSG": "Lucknow Super Giants",
    "DD": "Delhi Capitals",
    "KXIP": "Punjab Kings",
    "DEC": "Deccan Chargers",
    "PWI": "Pune Warriors",
    "KTK": "Kochi Tuskers Kerala",
    "RPS": "Rising Pune Supergiant",
    "GL": "Gujarat Lions"
}

def normalize_team(name):
    if not name or not isinstance(name, str): return "Unknown"
    name = name.strip()
    # Check if it's an acronym
    if name in ACRONYM_TO_FULL:
        return ACRONYM_TO_FULL[name]
    
    translations = {
        "Delhi Daredevils": "Delhi Capitals",
        "Kings XI Punjab": "Punjab Kings",
        "Rising Pune Supergiants": "Rising Pune Supergiant"
    }
    return translations.get(name, name)

def generate_intel():
    print("Starting Team Intelligence Generation...")
    
    # 1. Load Datasets
    batting = pd.read_csv(f"{INPUT_DIR}/batting_agg.csv")
    bowling = pd.read_csv(f"{INPUT_DIR}/bowling_agg.csv")
    awards = pd.read_csv(f"{INPUT_DIR}/ipl_awards_prices.csv")
    values = pd.read_csv(f"{INPUT_DIR}/player_value_scores.csv")
    
    with open(POINTS_TABLE_PATH, 'r') as f:
        points_raw = json.load(f)
    
    # Flatten Points Table
    flattened_points = []
    for season, teams_list in points_raw['seasons'].items():
        for t_info in teams_list:
            t_info['season'] = int(season)
            flattened_points.append(t_info)
    points_table = pd.DataFrame(flattened_points)

    # 2. Critical Join: Map teams to player_value_scores
    # We join on player and season to recover the team column
    player_team_map = batting[['player', 'season', 'team']].drop_duplicates()
    values = values.merge(player_team_map, on=['player', 'season'], how='left')

    # 3. Normalization
    batting['team_norm'] = batting['team'].apply(normalize_team)
    bowling['team_norm'] = bowling['team'].apply(normalize_team)
    awards['team_norm'] = awards['highest_buy_team'].apply(normalize_team)
    values['team_norm'] = values['team'].apply(normalize_team)
    points_table['team_norm'] = points_table['team'].apply(normalize_team)

    intelligence = {}
    all_teams = points_table['team_norm'].unique()
    
    # League Benchmarks
    league_avg_sr = batting['strike_rate'].mean()
    league_avg_econ = bowling['economy'].mean()

    for team in all_teams:
        if team == "Unknown": continue
        print(f"  Analysing {team}...")
        
        # --- FEATURE 1: PERFORMANCE ---
        team_points = points_table[points_table['team_norm'] == team]
        if not team_points.empty:
            best_season_row = team_points.sort_values(by=['rank', 'season']).iloc[0]
            worst_season_row = team_points.sort_values(by=['rank'], ascending=False).iloc[0]
            best_season = int(best_season_row['season'])
            worst_season = int(worst_season_row['season'])
            avg_finish = round(team_points['rank'].mean(), 1)
            playoff_rate = round((len(team_points[team_points['rank'] <= 4]) / len(team_points)) * 100)
        else:
            best_season, worst_season, avg_finish, playoff_rate = 0, 0, 0, 0

        # --- FEATURE 2: AUCTION DNA ---
        team_awards = awards[awards['team_norm'] == team]
        team_values = values[values['team_norm'] == team]
        
        highest_buy = "Unknown"
        if not team_awards.empty:
            top_buy_row = team_awards.sort_values(by='highest_buy_price_cr', ascending=False).iloc[0]
            highest_buy = f"{top_buy_row['highest_buy_player']} (₹{top_buy_row['highest_buy_price_cr']} Cr)"

        best_value = "N/A"
        worst_value = "N/A"
        if not team_values.empty:
            best_value = team_values.sort_values(by='value_score', ascending=False).iloc[0]['player']
            worst_value = team_values.sort_values(by='value_score', ascending=True).iloc[0]['player']
        
        avg_spend = round(team_awards['highest_buy_price_cr'].mean(), 2) if not team_awards.empty else 0
        
        # Strategy
        total_bat_val = team_values['total_runs'].sum() if 'total_runs' in team_values.columns else 0
        total_bowl_val = team_values['wickets'].sum() * 15 if 'wickets' in team_values.columns else 0
        if total_bowl_val > (total_bat_val * 0.15): strategy = "Bowling Heavy"
        elif total_bat_val > (total_bowl_val / 0.15): strategy = "Batting Heavy"
        else: strategy = "Balanced"

        # --- FEATURE 3: RECORDS ---
        team_batting = batting[batting['team_norm'] == team]
        team_bowling = bowling[bowling['team_norm'] == team]
        most_runs_player = team_batting.groupby('player')['total_runs'].sum().idxmax() if not team_batting.empty else "N/A"
        most_wkts_player = team_bowling.groupby('player')['wickets'].sum().idxmax() if not team_bowling.empty else "N/A"

        # --- FEATURE 5: ARCHETYPE ---
        team_econ = team_bowling['economy'].mean() if not team_bowling.empty else league_avg_econ
        team_sr = team_batting['strike_rate'].mean() if not team_batting.empty else league_avg_sr
        
        if team_econ < league_avg_econ * 0.98: archetype = "Bowling Dominant"
        elif team_sr > league_avg_sr * 1.02: archetype = "Batting Aggressive"
        else: archetype = "Balanced Team"

        intelligence[team] = {
            "performance": {
                "best_season": best_season,
                "worst_season": worst_season,
                "avg_finish": avg_finish,
                "playoff_rate": playoff_rate
            },
            "auction_dna": {
                "highest_buy": highest_buy,
                "best_value": best_value,
                "worst_value": worst_value,
                "avg_spend_per_season": avg_spend,
                "strategy": strategy
            },
            "records": {
                "most_runs": most_runs_player,
                "most_wickets": most_wkts_player,
                "highest_total": "Check Dashboard",
                "lowest_total": "Check Dashboard"
            },
            "archetype": archetype,
            "insight": f"{team} is a {archetype} with a {strategy} auction strategy."
        }

    # 4. Merge into existing bundle
    with open(TEAMS_BUNDLE_PATH, 'r') as f:
        bundle = json.load(f)
    
    for team_entry in bundle['teams']:
        full_name = normalize_team(team_entry['name'])
        if full_name in intelligence:
            team_entry['intelligence'] = intelligence[full_name]
    
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(bundle, f, indent=2)
    
    print(f"Intelligence successfully merged into {OUTPUT_PATH}")

if __name__ == "__main__":
    generate_intel()
