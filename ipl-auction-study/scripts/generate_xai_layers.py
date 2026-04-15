import pandas as pd
import json
import os
import numpy as np

# Paths
INPUT_DIR = "data/processed"
OUTPUT_DIR = "public/data/xai"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# --- REUSABLE CORE UTILITIES ---

def generate_reason(metric_name, value, league_avg):
    if league_avg == 0: return f"{metric_name} is being evaluated"
    diff = ((value - league_avg) / league_avg) * 100
    if diff > 10:
        return f"{metric_name} is {abs(diff):.1f}% above league average"
    elif diff < -10:
        return f"{metric_name} is {abs(diff):.1f}% below league average"
    else:
        return f"{metric_name} is close to league average"

def get_confidence(diff):
    if abs(diff) > 20:
        return "High"
    elif abs(diff) > 10:
        return "Medium"
    else:
        return "Low"

def get_multi_signal_reason(signals):
    """Combines multiple metric signals into a readable string."""
    parts = []
    for metric, val, avg in signals:
        diff = ((val - avg) / avg) * 100 if avg != 0 else 0
        if abs(diff) > 10:
            direction = "lower" if diff < 0 else "higher"
            parts.append(f"{metric} is {abs(diff):.1f}% {direction}")
    
    if not parts: return "Performance follows league standard trends"
    return " and ".join(parts[:2])

# --- FEATURE 1: TEAM EXPLAINABILITY ---

def compute_team_xai(batting, bowling):
    print("Computing Team XAI...")
    # Benchmarks
    l_econ = bowling['economy'].mean()
    l_wkts = bowling['wickets'].sum() / len(bowling['team'].unique())
    l_sr = batting['strike_rate'].mean()
    l_runs = batting['total_runs'].sum() / len(batting['team'].unique())

    team_xai = {}
    teams = batting['team'].unique()

    for team in teams:
        t_bat = batting[batting['team'] == team]
        t_bowl = bowling[bowling['team'] == team]
        
        t_econ = t_bowl['economy'].mean()
        t_wkts = t_bowl['wickets'].sum()
        t_sr = t_bat['strike_rate'].mean()
        
        # Archetype Logic
        if t_econ < l_econ * 0.95: 
            label = "Bowling Dominant"
            signals = [("Economy rate", t_econ, l_econ), ("Wicket taking", t_wkts, l_wkts)]
        elif t_sr > l_sr * 1.05:
            label = "Batting Aggressive"
            signals = [("Strike rate", t_sr, l_sr), ("Run production", t_bat['total_runs'].sum(), l_runs)]
        else:
            label = "Balanced Tactical"
            signals = [("Economy rate", t_econ, l_econ), ("Strike rate", t_sr, l_sr)]

        diff_primary = ((signals[0][1] - signals[0][2]) / signals[0][2]) * 100
        team_xai[team] = {
            "label": label,
            "reason": get_multi_signal_reason(signals),
            "confidence": get_confidence(diff_primary)
        }
    
    with open(f"{OUTPUT_DIR}/team_explainability.json", 'w') as f:
        json.dump(team_xai, f, indent=2)

# --- FEATURE 2: PLAYER ARCHETYPE EXPLAINABILITY ---

def compute_player_xai(batting, bowling):
    print("Computing Player XAI...")
    l_sr = batting['strike_rate'].mean()
    l_avg = batting['batting_average'].mean()
    l_econ = bowling['economy'].mean()
    
    player_xai = {}
    
    # Process Batters
    for _, p in batting.iterrows():
        name = p['player']
        if p['strike_rate'] > l_sr * 1.2:
            role = "Power Finisher"
            metric, val, avg = "Strike rate", p['strike_rate'], l_sr
        elif p['batting_average'] > l_avg * 1.2:
            role = "Technical Anchor"
            metric, val, avg = "Batting average", p['batting_average'], l_avg
        else:
            role = "Reliable Rotator"
            metric, val, avg = "Consistency", p['batting_average'], l_avg
        
        diff = ((val - avg) / avg) * 100
        player_xai[name] = {
            "label": role,
            "reason": generate_reason(metric, val, avg),
            "confidence": get_confidence(diff)
        }

    # Process Bowlers (Overwriting/Updating if common)
    for _, p in bowling.iterrows():
        name = p['player']
        if p['economy'] < l_econ * 0.9:
            role = "Control Bowler"
            metric, val, avg = "Economy rate", p['economy'], l_econ
        else:
            role = "Wicket Hunter"
            metric, val, avg = "Strike rate", p['bowling_strike_rate'], 20 

        diff = ((val - avg) / avg) * 100 if avg != 0 else 0
        player_xai[name] = {
            "label": role,
            "reason": generate_reason(metric, val, avg),
            "confidence": get_confidence(diff)
        }

    with open(f"{OUTPUT_DIR}/player_explainability.json", 'w') as f:
        json.dump(player_xai, f, indent=2)

# --- FEATURE 3: AUCTION VALUE EXPLAINABILITY ---

def compute_auction_xai(values):
    print("Computing Auction XAI...")
    # efficiency = value_score / price
    # Filter out 0 price to avoid inf
    valid_values = values[values['price_cr'] > 0].copy()
    valid_values['efficiency'] = valid_values['value_score'] / valid_values['price_cr']
    l_eff = valid_values['efficiency'].mean()

    auction_xai = {}
    for _, p in valid_values.iterrows():
        name = p['player']
        ratio = p['efficiency'] / l_eff
        
        if ratio > 1.5:
            verdict = "High Value"
        elif ratio < 0.7:
            verdict = "Overpriced"
        else:
            verdict = "Fair Value"
        
        diff = (ratio - 1) * 100
        auction_xai[name] = {
            "label": verdict,
            "reason": f"Efficiency is {ratio:.1f}x higher than league average for similar price range",
            "confidence": get_confidence(diff)
        }
    
    with open(f"{OUTPUT_DIR}/auction_explainability.json", 'w') as f:
        json.dump(auction_xai, f, indent=2)

# --- RUN PIPELINE ---

def main():
    batting = pd.read_csv(f"{INPUT_DIR}/batting_agg.csv")
    bowling = pd.read_csv(f"{INPUT_DIR}/bowling_agg.csv")
    values = pd.read_csv(f"{INPUT_DIR}/player_value_scores.csv")
    
    compute_team_xai(batting, bowling)
    compute_player_xai(batting, bowling)
    compute_auction_xai(values)
    print("All XAI Layers Generated Successfully.")

if __name__ == "__main__":
    main()
