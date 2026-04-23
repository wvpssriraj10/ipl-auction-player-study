import pandas as pd
import json
import os

BAT_PATH = os.path.join(os.path.dirname(__file__), "..", "ipl-auction-study", "public", "data", "processed", "batting_agg.csv")
BOWL_PATH = os.path.join(os.path.dirname(__file__), "..", "ipl-auction-study", "public", "data", "processed", "bowling_agg.csv")
VALUE_PATH = os.path.join(os.path.dirname(__file__), "..", "ipl-auction-study", "public", "data", "processed", "player_value_scores.csv")
AWARDS_PATH = os.path.join(os.path.dirname(__file__), "..", "ipl-auction-study", "public", "data", "processed", "ipl_awards_prices.csv")
XAI_DIR = os.path.join(os.path.dirname(__file__), "..", "ipl-auction-study", "public", "data", "xai")


def classify_player(sr, avg, economy, wickets, league_avg_sr, league_avg_avg, league_avg_eco):
    sr_diff = (sr - league_avg_sr) / league_avg_sr * 100
    avg_diff = (avg - league_avg_avg) / league_avg_avg * 100
    eco_diff = (economy - league_avg_eco) / league_avg_eco * 100 if economy > 0 else 0

    if sr_diff >= 20:
        label = "Power Finisher"
        reason = f"Strike rate is {abs(sr_diff):.1f}% higher than league average"
        confidence = "High" if sr_diff >= 30 else "Medium"
    elif avg_diff >= 30:
        label = "Technical Anchor"
        reason = f"Batting average is {abs(avg_diff):.1f}% higher than league average"
        confidence = "High" if avg_diff >= 50 else "Medium"
    elif wickets > 5 or eco_diff < -10:
        label = "Control Bowler"
        reason = f"Economy rate is {abs(eco_diff):.1f}% lower than league average"
        confidence = "High" if abs(eco_diff) >= 25 else ("Medium" if abs(eco_diff) >= 15 else "Low")
    elif eco_diff > 10:
        label = "Wicket Hunter"
        reason = f"Economy rate is {abs(eco_diff):.1f}% higher than league average"
        confidence = "High" if abs(eco_diff) >= 30 else ("Medium" if abs(eco_diff) >= 15 else "Low")
    else:
        consistency = abs(avg_diff)
        label = "Reliable Rotator"
        direction = "lower" if avg_diff < 0 else "higher"
        reason = f"Consistency is {consistency:.1f}% {direction} than league average"
        confidence = "High" if consistency >= 40 else ("Medium" if consistency >= 20 else "Low")

    return label, reason, confidence


def generate_player_xai(bat, bowl):
    league_avg_sr = bat["strike_rate"].mean()
    league_avg_avg = bat["batting_average"].mean()
    league_avg_eco = bowl["economy"].mean()

    player_bat = bat.groupby("player").agg(
        strike_rate=("strike_rate", "mean"),
        batting_average=("batting_average", "mean"),
    ).reset_index()

    player_bowl = bowl.groupby("player").agg(
        economy=("economy", "mean"),
        wickets=("wickets", "sum"),
    ).reset_index()

    merged = player_bat.merge(player_bowl, on="player", how="left")
    merged["economy"] = merged["economy"].fillna(0)
    merged["wickets"] = merged["wickets"].fillna(0)

    result = {}
    for _, row in merged.iterrows():
        label, reason, confidence = classify_player(
            row["strike_rate"], row["batting_average"],
            row["economy"], row["wickets"],
            league_avg_sr, league_avg_avg, league_avg_eco,
        )
        result[row["player"]] = {"label": label, "reason": reason, "confidence": confidence}
    return result


def generate_team_xai(bat, bowl):
    league_avg_sr = bat["strike_rate"].mean()
    league_avg_eco = bowl["economy"].mean()

    team_bat = bat.groupby("team").agg(strike_rate=("strike_rate", "mean")).reset_index()
    team_bowl = bowl.groupby("team").agg(economy=("economy", "mean")).reset_index()
    team = team_bat.merge(team_bowl, on="team", how="outer")

    result = {}
    for _, row in team.iterrows():
        sr_diff = (row["strike_rate"] - league_avg_sr) / league_avg_sr * 100 if pd.notna(row["strike_rate"]) else 0
        eco_diff = (row["economy"] - league_avg_eco) / league_avg_eco * 100 if pd.notna(row["economy"]) else 0

        if sr_diff >= 5:
            label = "Batting Aggressive"
            reason = f"Strike rate is {abs(sr_diff):.1f}% higher than league average"
            confidence = "High" if sr_diff >= 10 else "Low"
        elif eco_diff <= -3:
            label = "Bowling Dominant"
            reason = f"Economy rate is {abs(eco_diff):.1f}% lower than league average"
            confidence = "High" if abs(eco_diff) >= 10 else ("Medium" if abs(eco_diff) >= 5 else "Low")
        else:
            balance = abs(sr_diff + eco_diff)
            direction = "lower" if (sr_diff + eco_diff) < 0 else "higher"
            label = "Balanced Tactical"
            reason = f"Performance balance is {balance:.1f}% {direction} than league average"
            confidence = "High" if balance >= 10 else "Low"

        result[row["team"]] = {"label": label, "reason": reason, "confidence": confidence}
    return result


def generate_auction_xai(value_df, awards_df):
    priced = value_df[value_df["price_cr"].notna() & (value_df["price_cr"] > 0)].copy()
    priced["roi"] = priced["raw_score"] / priced["price_cr"]
    avg_roi = priced["roi"].mean()

    result = {}
    for _, row in priced.iterrows():
        roi_ratio = row["roi"] / avg_roi if avg_roi > 0 else 0
        if roi_ratio >= 1.5:
            label = "High Value"
        elif roi_ratio >= 0.8:
            label = "Fair Value"
        else:
            label = "Overpriced"
        reason = f"ROI Efficiency is {roi_ratio:.1f}x the league average"
        confidence = "High" if abs(roi_ratio - 1) >= 0.3 else "Low"
        result[row["player"]] = {"label": label, "reason": reason, "confidence": confidence}
    return result


def main():
    bat = pd.read_csv(BAT_PATH)
    bowl = pd.read_csv(BOWL_PATH)
    value = pd.read_csv(VALUE_PATH)
    awards = pd.read_csv(AWARDS_PATH) if os.path.exists(AWARDS_PATH) else pd.DataFrame()

    os.makedirs(XAI_DIR, exist_ok=True)

    print("Generating player explainability...")
    player_xai = generate_player_xai(bat, bowl)
    with open(os.path.join(XAI_DIR, "player_explainability.json"), "w") as f:
        json.dump(player_xai, f, indent=2)
    print(f"  {len(player_xai)} players")

    print("Generating team explainability...")
    team_xai = generate_team_xai(bat, bowl)
    with open(os.path.join(XAI_DIR, "team_explainability.json"), "w") as f:
        json.dump(team_xai, f, indent=2)
    print(f"  {len(team_xai)} teams")

    print("Generating auction explainability...")
    auction_xai = generate_auction_xai(value, awards)
    with open(os.path.join(XAI_DIR, "auction_explainability.json"), "w") as f:
        json.dump(auction_xai, f, indent=2)
    print(f"  {len(auction_xai)} auction entries")


if __name__ == "__main__":
    main()
