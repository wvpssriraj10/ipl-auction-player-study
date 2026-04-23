import pandas as pd
import os

DATA_PATH = os.path.join(os.path.dirname(__file__), "deliveries.csv")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "ipl-auction-study", "public", "data", "processed")

TEAM_NAME_MAP = {
    "Deccan Chargers": "Sunrisers Hyderabad",
    "Delhi Daredevils": "Delhi Capitals",
    "Kings XI Punjab": "Punjab Kings",
    "Royal Challengers Bangalore": "Royal Challengers Bengaluru",
}

def normalize_team(name):
    return TEAM_NAME_MAP.get(name, name)

def generate_batting_agg(df):
    df = df.copy()
    df["batting_team"] = df["batting_team"].map(normalize_team).fillna(df["batting_team"])

    bat = df.groupby(["season", "batter", "batting_team"]).agg(
        total_runs=("batsman_runs", "sum"),
        fours=("batsman_runs", lambda x: (x == 4).sum()),
        sixes=("batsman_runs", lambda x: (x == 6).sum()),
        balls_faced=("ball", "count"),
    ).reset_index()

    matches = df.groupby(["season", "batter", "batting_team"])["match_id"].nunique().reset_index()
    matches.columns = ["season", "batter", "batting_team", "matches"]

    innings = df.groupby(["season", "batter", "batting_team"])["match_id"].nunique().reset_index()
    innings.columns = ["season", "batter", "batting_team", "innings"]

    dismissals = df[df["player_dismissed"] == df["batter"]].groupby(
        ["season", "batter", "batting_team"]
    ).size().reset_index(name="outs")

    bat = bat.merge(matches, on=["season", "batter", "batting_team"])
    bat = bat.merge(innings, on=["season", "batter", "batting_team"])
    bat = bat.merge(dismissals, on=["season", "batter", "batting_team"], how="left")
    bat["outs"] = bat["outs"].fillna(0).astype(int)

    bat["strike_rate"] = (bat["total_runs"] / bat["balls_faced"] * 100).round(2)
    bat["batting_average"] = (bat["total_runs"] / bat["outs"].replace(0, float("nan"))).round(2).fillna(
        bat["total_runs"]
    )

    bat = bat.rename(columns={"batter": "player", "batting_team": "team"})
    bat = bat[["season", "player", "total_runs", "fours", "sixes", "balls_faced",
               "matches", "innings", "team", "outs", "strike_rate", "batting_average"]]
    return bat

def generate_bowling_agg(df):
    df = df.copy()
    df["bowling_team"] = df["bowling_team"].map(normalize_team).fillna(df["bowling_team"])

    bowl = df.groupby(["season", "bowler", "bowling_team"]).agg(
        wickets=("is_wicket", lambda x: x[df.loc[x.index, "dismissal_kind"].isin([
            "bowled", "caught", "lbw", "caught and bowled", "hit wicket", "stumped"
        ])].sum() if "dismissal_kind" in df.columns else x.sum()),
        runs_conceded=("total_runs", lambda x: x.sum() - df.loc[x.index, "wide_runs"].sum()
                       - df.loc[x.index, "noball_runs"].sum()),
        balls_bowled=("ball", lambda x: (df.loc[x.index, "wide_runs"] == 0).sum()),
        dot_balls=("batsman_runs", lambda x: (x == 0).sum()),
        matches_bowled=("match_id", "nunique"),
    ).reset_index()

    bowl["economy"] = (bowl["runs_conceded"] / bowl["balls_bowled"] * 6).round(2)
    bowl["bowling_average"] = (bowl["runs_conceded"] / bowl["wickets"].replace(0, float("nan"))).round(2).fillna(
        bowl["runs_conceded"]
    )
    bowl["bowling_strike_rate"] = (bowl["balls_bowled"] / bowl["wickets"].replace(0, float("nan"))).round(2).fillna(
        bowl["balls_bowled"]
    )

    bowl = bowl.rename(columns={"bowler": "player", "bowling_team": "team"})
    bowl = bowl[["season", "player", "wickets", "runs_conceded", "balls_bowled",
                 "dot_balls", "matches_bowled", "team", "economy", "bowling_average", "bowling_strike_rate"]]
    return bowl

def main():
    print("Loading deliveries data...")
    df = pd.read_csv(DATA_PATH)

    os.makedirs(OUT_DIR, exist_ok=True)

    print("Generating batting aggregates...")
    bat = generate_batting_agg(df)
    bat_path = os.path.join(OUT_DIR, "batting_agg.csv")
    bat.to_csv(bat_path, index=False)
    print(f"  Saved {len(bat)} rows -> {bat_path}")

    print("Generating bowling aggregates...")
    bowl = generate_bowling_agg(df)
    bowl_path = os.path.join(OUT_DIR, "bowling_agg.csv")
    bowl.to_csv(bowl_path, index=False)
    print(f"  Saved {len(bowl)} rows -> {bowl_path}")

if __name__ == "__main__":
    main()
