import pandas as pd
import os

BAT_PATH = os.path.join(os.path.dirname(__file__), "..", "ipl-auction-study", "public", "data", "processed", "batting_agg.csv")
BOWL_PATH = os.path.join(os.path.dirname(__file__), "..", "ipl-auction-study", "public", "data", "processed", "bowling_agg.csv")
AWARDS_PATH = os.path.join(os.path.dirname(__file__), "..", "ipl-auction-study", "public", "data", "processed", "ipl_awards_prices.csv")
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "ipl-auction-study", "public", "data", "processed", "player_value_scores.csv")

BATTING_WEIGHT = 1.0
SR_WEIGHT = 0.4
FOUR_WEIGHT = 2.0
SIX_WEIGHT = 6.0
BOWL_WICKET_WEIGHT = 20.0
BOWL_ECO_THRESHOLD = 8.0

def compute_bowling_bonus(wickets, balls_bowled, economy):
    if balls_bowled == 0 or wickets == 0:
        return 0
    bonus = wickets * BOWL_WICKET_WEIGHT
    if economy < BOWL_ECO_THRESHOLD:
        bonus *= (1 + (BOWL_ECO_THRESHOLD - economy) / BOWL_ECO_THRESHOLD)
    return bonus

def main():
    bat = pd.read_csv(BAT_PATH)
    bowl = pd.read_csv(BOWL_PATH)
    awards = pd.read_csv(AWARDS_PATH) if os.path.exists(AWARDS_PATH) else None

    bat["raw_score"] = (
        bat["total_runs"] * BATTING_WEIGHT
        + bat["strike_rate"] * SR_WEIGHT
        + bat["fours"] * FOUR_WEIGHT
        + bat["sixes"] * SIX_WEIGHT
    )

    bowl_grouped = bowl.groupby(["season", "player"]).agg(
        wickets=("wickets", "sum"),
        balls_bowled=("balls_bowled", "sum"),
        economy=("economy", "mean"),
    ).reset_index()

    merged = bat.merge(bowl_grouped, on=["season", "player"], how="left")
    merged["wickets"] = merged["wickets"].fillna(0)
    merged["balls_bowled"] = merged["balls_bowled"].fillna(0)
    merged["economy"] = merged["economy"].fillna(0)

    merged["bowling_bonus"] = merged.apply(
        lambda r: compute_bowling_bonus(r["wickets"], r["balls_bowled"], r["economy"]), axis=1
    )
    merged["raw_score"] += merged["bowling_bonus"]

    price_map = {}
    big_buy_map = {}
    if awards is not None:
        for _, row in awards.iterrows():
            season = row["season"]
            player = row["highest_buy_player"]
            price = row["highest_buy_price_cr"]
            price_map[(player, season)] = price
            big_buy_map[(player, season)] = True

    merged["price_cr"] = merged.apply(
        lambda r: price_map.get((r["player"], r["season"]), None), axis=1
    )
    merged["value_score"] = merged.apply(
        lambda r: r["raw_score"] / r["price_cr"] if pd.notna(r["price_cr"]) and r["price_cr"] > 0 else r["raw_score"],
        axis=1,
    )
    merged["is_big_buy"] = merged.apply(
        lambda r: big_buy_map.get((r["player"], r["season"]), False), axis=1
    )

    out = merged[[
        "player", "season", "total_runs", "balls_faced", "strike_rate",
        "fours", "sixes", "wickets", "balls_bowled", "economy",
        "raw_score", "price_cr", "value_score", "is_big_buy"
    ]].sort_values("raw_score", ascending=False)

    out.to_csv(OUT_PATH, index=False)
    print(f"Saved {len(out)} rows -> {OUT_PATH}")

if __name__ == "__main__":
    main()
