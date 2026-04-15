import pandas as pd
import json
import os
import numpy as np

# Paths
INPUT_DIR = "data/processed"
OUTPUT_DIR = "public/data/xai"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# THRESHOLDS
MIN_MATCHES_PLAYER = 5
MIN_SEASONS_TEAM = 1

# --- REUSABLE CORE UTILITIES ---

def get_confidence(diff, sample_size=10, threshold=5):
    """
    Computes confidence based on delta from average + sample size.
    Degrades confidence if sample size is below threshold.
    """
    abs_diff = abs(diff)
    if abs_diff >= 20: 
        level = "High"
    elif abs_diff >= 10:
        level = "Medium"
    else:
        level = "Low"
    
    # Sample Size Degradation
    if sample_size < threshold:
        if level == "High": level = "Medium"
        elif level == "Medium": level = "Low"
    
    return level

def create_tagged_insight(label, metric_name, value, league_avg, sample_size, threshold):
    """Reusable helper to wrap any metric comparison into a tagged insight object."""
    diff = ((value - league_avg) / league_avg) * 100 if league_avg != 0 else 0
    
    direction = "higher" if diff > 0 else "lower"
    reason = f"{metric_name} is {abs(diff):.1f}% {direction} than league average"
    
    return {
        "label": label,
        "reason": reason,
        "confidence": get_confidence(diff, sample_size, threshold)
    }

# --- FEATURE 1: TEAM EXPLAINABILITY ---

def compute_team_xai(batting, bowling):
    print("Computing Team Reliability Layers...")
    l_econ = bowling['economy'].mean()
    l_sr = batting['strike_rate'].mean()

    team_xai = {}
    teams = batting['team'].unique()

    for team in teams:
        t_bat = batting[batting['team'] == team]
        t_bowl = bowling[bowling['team'] == team]
        t_econ = t_bowl['economy'].mean()
        t_sr = t_bat['strike_rate'].mean()
        
        # Team sample size = seasons active
        seasons = len(t_bat['season'].unique())

        if t_econ < l_econ * 0.98: 
            label = "Bowling Dominant"
            team_xai[team] = create_tagged_insight(label, "Economy rate", t_econ, l_econ, seasons, MIN_SEASONS_TEAM)
        elif t_sr > l_sr * 1.02:
            label = "Batting Aggressive"
            team_xai[team] = create_tagged_insight(label, "Strike rate", t_sr, l_sr, seasons, MIN_SEASONS_TEAM)
        else:
            team_xai[team] = create_tagged_insight("Balanced Tactical", "Performance balance", t_sr, l_sr, seasons, MIN_SEASONS_TEAM)
    
    with open(f"{OUTPUT_DIR}/team_explainability.json", 'w') as f:
        json.dump(team_xai, f, indent=2)

# --- FEATURE 2: PLAYER ARCHETYPE EXPLAINABILITY ---

def compute_player_xai(batting, bowling):
    print("Computing Player Reliability Layers...")
    l_sr = batting['strike_rate'].mean()
    l_avg = batting['batting_average'].mean()
    l_econ = bowling['economy'].mean()
    
    player_xai = {}
    
    for _, p in batting.iterrows():
        name = p['player']
        matches = p['matches']
        if p['strike_rate'] > l_sr * 1.2:
            player_xai[name] = create_tagged_insight("Power Finisher", "Strike rate", p['strike_rate'], l_sr, matches, MIN_MATCHES_PLAYER)
        elif p['batting_average'] > l_avg * 1.2:
            player_xai[name] = create_tagged_insight("Technical Anchor", "Batting average", p['batting_average'], l_avg, matches, MIN_MATCHES_PLAYER)
        else:
            player_xai[name] = create_tagged_insight("Reliable Rotator", "Consistency", p['batting_average'], l_avg, matches, MIN_MATCHES_PLAYER)

    for _, p in bowling.iterrows():
        name = p['player']
        matches = p['matches_bowled']
        if p['economy'] < l_econ * 0.9:
            player_xai[name] = create_tagged_insight("Control Bowler", "Economy rate", p['economy'], l_econ, matches, MIN_MATCHES_PLAYER)
        else:
            player_xai[name] = create_tagged_insight("Wicket Hunter", "Economy rate", p['economy'], l_econ, matches, MIN_MATCHES_PLAYER)

    with open(f"{OUTPUT_DIR}/player_explainability.json", 'w') as f:
        json.dump(player_xai, f, indent=2)

# --- FEATURE 3: AUCTION VALUE EXPLAINABILITY ---

def compute_auction_xai(values):
    print("Computing Auction Value Reliability...")
    valid_values = values[values['price_cr'] > 0].copy()
    valid_values['efficiency'] = valid_values['value_score'] / valid_values['price_cr']
    l_eff = valid_values['efficiency'].mean()

    auction_xai = {}
    for _, p in valid_values.iterrows():
        name = p['player']
        # For auction value, sample size is total matches in that valuation cycle
        # If matches are low, we don't fully trust the ROI score
        matches = p['matches'] if 'matches' in p else 5
        
        ratio = p['efficiency'] / l_eff
        diff = (ratio - 1) * 100
        
        if ratio > 1.5: label = "High Value"
        elif ratio < 0.7: label = "Overpriced"
        else: label = "Fair Value"
        
        auction_xai[name] = create_tagged_insight(label, "Efficiency", p['efficiency'], l_eff, matches, MIN_MATCHES_PLAYER)
        # Update reason to mention ROI
        auction_xai[name]['reason'] = f"ROI Efficiency is {ratio:.1f}x the league average"
    
    with open(f"{OUTPUT_DIR}/auction_explainability.json", 'w') as f:
        json.dump(auction_xai, f, indent=2)

def main():
    batting = pd.read_csv(f"{INPUT_DIR}/batting_agg.csv")
    bowling = pd.read_csv(f"{INPUT_DIR}/bowling_agg.csv")
    values = pd.read_csv(f"{INPUT_DIR}/player_value_scores.csv")
    
    compute_team_xai(batting, bowling)
    compute_player_xai(batting, bowling)
    compute_auction_xai(values)
    print("Reliability Tags and XAI Layers Generated.")

if __name__ == "__main__":
    main()
