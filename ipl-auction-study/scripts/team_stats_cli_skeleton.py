"""
IPL Auction Decision Intelligence Chatbot (CLI).

Data sources used (only processed pipeline outputs):
- batting_agg.csv
- bowling_agg.csv
- player_value_scores.csv
- ipl_awards_prices.csv
"""

from __future__ import annotations

import os
import re
from typing import Dict, List, Optional, Tuple

import pandas as pd


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")

BATTING_CSV = os.path.join(PROCESSED_DIR, "batting_agg.csv")
BOWLING_CSV = os.path.join(PROCESSED_DIR, "bowling_agg.csv")
VALUE_CSV = os.path.join(PROCESSED_DIR, "player_value_scores.csv")
AWARDS_CSV = os.path.join(PROCESSED_DIR, "ipl_awards_prices.csv")


TEAM_ALIASES = {
    "csk": "Chennai Super Kings",
    "dc": "Delhi Capitals",
    "gt": "Gujarat Titans",
    "kkr": "Kolkata Knight Riders",
    "lsg": "Lucknow Super Giants",
    "mi": "Mumbai Indians",
    "pbks": "Punjab Kings",
    "rr": "Rajasthan Royals",
    "rcb": "Royal Challengers Bengaluru",
    "srh": "Sunrisers Hyderabad",
}


def verdict_from_value(v: float) -> str:
    if v >= 30:
        return "High Value"
    if v >= 15:
        return "Average"
    return "Overpriced"


class IPLAuctionChatbot:
    def __init__(self) -> None:
        self.batting = pd.read_csv(BATTING_CSV)
        self.bowling = pd.read_csv(BOWLING_CSV)
        self.values = pd.read_csv(VALUE_CSV)
        self.awards = pd.read_csv(AWARDS_CSV)

        self.latest_season = int(self.values["season"].max())
        self.players = sorted(
            set(self.values["player"].dropna().astype(str).tolist())
            | set(self.awards["highest_buy_player"].dropna().astype(str).tolist())
            | set(self.awards["orange_cap"].dropna().astype(str).tolist())
            | set(self.awards["purple_cap"].dropna().astype(str).tolist())
            | set(self.awards["mvp"].dropna().astype(str).tolist())
        )
        self.teams = sorted(self.awards["highest_buy_team"].dropna().astype(str).unique().tolist())
        self._prepare_big_buy_table()

    def _prepare_big_buy_table(self) -> None:
        bb = self.values[self.values["is_big_buy"] == True][["season", "player", "raw_score", "value_score", "price_cr"]].copy()
        self.big_buys = bb.merge(
            self.awards[["season", "highest_buy_team", "highest_buy_player", "buy_runs", "buy_sr", "buy_wickets", "buy_economy", "won_any", "won_orange", "won_purple", "won_mvp", "orange_cap"]],
            on="season",
            how="left",
        )

    @staticmethod
    def _extract_season(text: str) -> Optional[int]:
        years = re.findall(r"\b(20[0-2][0-9])\b", text)
        return int(years[0]) if years else None

    def _extract_player(self, text: str) -> Optional[str]:
        q = text.lower()
        exact = [p for p in self.players if p.lower() in q]
        if exact:
            return max(exact, key=len)
        return None

    def _resolve_player_fragment(self, fragment: str, season: Optional[int] = None) -> Optional[str]:
        frag = re.sub(r"[^a-zA-Z\s]", " ", fragment).strip().lower()
        frag = re.sub(r"\b(compare|in|season|player|stats|of)\b", " ", frag)
        frag = re.sub(r"\s+", " ", frag).strip()
        if not frag:
            return None

        pool = self.values[self.values["season"] == season]["player"].dropna().astype(str).unique().tolist() if season else self.players

        exact = [p for p in pool if p.lower() == frag]
        if exact:
            return exact[0]

        contains = [p for p in pool if frag in p.lower()]
        if contains:
            return max(contains, key=len)

        parts = [x for x in frag.split() if x]
        if not parts:
            return None
        surname = parts[-1]
        surname_matches = [p for p in pool if p.lower().split()[-1] == surname]
        if surname_matches:
            return surname_matches[0]
        return None

    def _extract_team(self, text: str) -> Optional[str]:
        for short, full in TEAM_ALIASES.items():
            if re.search(rf"\b{re.escape(short)}\b", text, flags=re.IGNORECASE):
                return full
        for t in self.teams:
            if re.search(rf"\b{re.escape(t)}\b", text, flags=re.IGNORECASE):
                return t
        return None

    @staticmethod
    def _intent(query: str) -> str:
        q = query.lower()
        if "compare" in q and "vs" in q:
            return "comparison"
        if any(k in q for k in ["team-wise", "team wise", "in csk", "in mi", "in srh", "in rcb", "in rr", "in kkr", "in dc", "in lsg", "in gt", "in pbks", "for chennai", "for mumbai", "top batsmen in", "top bowlers in", "best player in"]):
            return "team"
        if any(k in q for k in ["correlation", "hit rate", "era", "consistently top"]):
            return "trend"
        if any(k in q for k in ["orange cap", "purple cap", "mvp", "award", "won any"]):
            return "awards"
        if any(k in q for k in ["wickets", "economy", "bowler", "bowling"]):
            return "bowling"
        if any(k in q for k in ["runs", "strike rate", "batsmen", "batsman", "batting"]):
            return "batting"
        if any(k in q for k in ["highest-paid", "highest paid", "worth", "value", "roi", "overpriced", "auction", "expensive"]):
            return "auction"
        return "auction"

    def answer(self, query: str) -> str:
        intent = self._intent(query)
        season = self._extract_season(query) or self.latest_season
        player = self._extract_player(query)
        team = self._extract_team(query)

        if intent == "auction":
            return self._answer_auction(query.lower(), season)
        if intent == "batting":
            return self._answer_batting(query.lower(), season, player)
        if intent == "bowling":
            return self._answer_bowling(query.lower(), season, player)
        if intent == "awards":
            return self._answer_awards(query.lower(), season)
        if intent == "trend":
            return self._answer_trends(query.lower())
        if intent == "team":
            return self._answer_team(query.lower(), season, team)
        if intent == "comparison":
            return self._answer_comparison(query, season)
        return "I could not classify that query. Please ask about auction value, batting, bowling, awards, trends, team, or comparison."

    def _answer_auction(self, q: str, season: int) -> str:
        big = self.big_buys.copy()
        if "worth" in q and ("highest-paid" in q or "highest paid" in q):
            row = big[big["season"] == season]
            if row.empty:
                return f"No highest-buy data found for season {season}."
            r = row.iloc[0]
            verdict = verdict_from_value(float(r["value_score"]))
            return (
                f"{r['highest_buy_player']} ({season})\n"
                f"- Price: Rs {r['price_cr']} Cr\n"
                f"- Runs: {int(r['buy_runs']) if pd.notna(r['buy_runs']) else 'NA'} | SR: {round(float(r['buy_sr']), 2) if pd.notna(r['buy_sr']) else 'NA'}\n"
                f"- Wickets: {int(r['buy_wickets']) if pd.notna(r['buy_wickets']) else 'NA'} | Economy: {round(float(r['buy_economy']), 2) if pd.notna(r['buy_economy']) else 'NA'}\n"
                f"- Value Score: {round(float(r['value_score']), 2)}\n\n"
                f"Verdict: {verdict}\n"
                f"Insight: This combines batting + bowling impact relative to auction price."
            )

        if "best value score" in q or "best value" in q:
            r = big.sort_values("value_score", ascending=False).iloc[0]
            return f"Best highest-buy value season: {int(r['season'])}, {r['player']} with Value Score {round(float(r['value_score']),2)}."
        if "performed the worst" in q or "worst" in q or "overpriced" in q:
            r = big.sort_values("value_score", ascending=True).iloc[0]
            return f"Worst highest-buy season: {int(r['season'])}, {r['player']} with Value Score {round(float(r['value_score']),2)} (Overpriced)."
        if "top 5 value-for-money" in q or "top 5 value for money" in q:
            top = big.sort_values("value_score", ascending=False).head(5)
            lines = [f"{i}. {r.player} ({int(r.season)}) - {r.value_score:.2f}" for i, r in enumerate(top.itertuples(index=False), start=1)]
            return "Top 5 value-for-money highest buys:\n" + "\n".join(lines)
        if "bottom 5" in q:
            bot = big.sort_values("value_score", ascending=True).head(5)
            lines = [f"{i}. {r.player} ({int(r.season)}) - {r.value_score:.2f}" for i, r in enumerate(bot.itertuples(index=False), start=1)]
            return "Bottom 5 overpriced highest buys:\n" + "\n".join(lines)
        if "best roi" in q:
            r = big.sort_values("value_score", ascending=False).iloc[0]
            return f"Best ROI season: {int(r['season'])} ({r['player']}, Value Score {r['value_score']:.2f})."
        if "worst roi" in q:
            r = big.sort_values("value_score", ascending=True).iloc[0]
            return f"Worst ROI season: {int(r['season'])} ({r['player']}, Value Score {r['value_score']:.2f})."
        if "how often" in q and "good value" in q:
            verdicts = big["value_score"].apply(verdict_from_value)
            high = int((verdicts == "High Value").sum())
            avg = int((verdicts == "Average").sum())
            low = int((verdicts == "Overpriced").sum())
            total = len(big)
            return (
                f"Highest-buy value distribution across {total} seasons:\n"
                f"- High Value: {high}\n- Average: {avg}\n- Overpriced: {low}\n"
                f"Insight: High-value seasons are relatively rare."
            )
        return "Auction intent detected, but query pattern is not matched yet. Try: 'Was the highest-paid player worth it in 2021?'"

    def _answer_batting(self, q: str, season: int, player: Optional[str]) -> str:
        b = self.batting.copy()
        if player and ("runs" in q or "strike rate" in q):
            row = b[(b["season"] == season) & (b["player"] == player)]
            if row.empty:
                return f"No batting record found for {player} in {season}."
            r = row.iloc[0]
            return (
                f"{player} ({season})\n"
                f"- Runs: {int(r['total_runs'])}\n- Balls: {int(r['balls_faced'])}\n- Strike Rate: {r['strike_rate']:.2f}\n"
                f"Insight: Solid season output in this dataset context."
            )
        if "top 5" in q and ("batsmen" in q or "batsman" in q):
            top = b[b["season"] == season].sort_values("total_runs", ascending=False).head(5)
            lines = [f"{i}. {r.player} - {int(r.total_runs)} runs" for i, r in enumerate(top.itertuples(index=False), start=1)]
            return f"Top 5 batsmen in {season}:\n" + "\n".join(lines)
        if "highest run scorer" in q:
            row = b[b["season"] == season].sort_values("total_runs", ascending=False).head(1)
            if row.empty:
                return f"No batting data for season {season}."
            r = row.iloc[0]
            return f"Highest run scorer in {season}: {r['player']} with {int(r['total_runs'])} runs."
        if "ipl history" in q and "most runs" in q:
            g = b.groupby("player", as_index=False)["total_runs"].sum().sort_values("total_runs", ascending=False).head(10)
            lines = [f"{i}. {r.player} - {int(r.total_runs)} runs" for i, r in enumerate(g.itertuples(index=False), start=1)]
            return "Most runs in IPL history (dataset period):\n" + "\n".join(lines)
        if "best strike rate" in q:
            filt = b[b["balls_faced"] >= 100].sort_values("strike_rate", ascending=False).head(10)
            lines = [f"{i}. {r.player} ({int(r.season)}) - SR {r.strike_rate:.2f}, Balls {int(r.balls_faced)}" for i, r in enumerate(filt.itertuples(index=False), start=1)]
            return "Best strike-rate seasons (min 100 balls):\n" + "\n".join(lines)
        if "single season" in q and "most runs" in q:
            r = b.sort_values("total_runs", ascending=False).iloc[0]
            return f"Most runs in a single season: {r['player']} ({int(r['season'])}) with {int(r['total_runs'])} runs."
        if "consistent" in q:
            g = b.groupby("player", as_index=False).agg(avg_runs=("total_runs", "mean"), seasons=("season", "nunique"))
            g = g[g["seasons"] >= 3].sort_values("avg_runs", ascending=False).head(10)
            lines = [f"{i}. {r.player} - Avg {r.avg_runs:.1f} runs over {int(r.seasons)} seasons" for i, r in enumerate(g.itertuples(index=False), start=1)]
            return "Top consistent batsmen (min 3 seasons):\n" + "\n".join(lines)
        return "Batting intent detected. Try: 'Runs scored by KL Rahul in 2021' or 'Top 5 batsmen in 2020'."

    def _answer_bowling(self, q: str, season: int, player: Optional[str]) -> str:
        bw = self.bowling.copy()
        if player and ("stats" in q or "wickets" in q or "economy" in q):
            row = bw[(bw["season"] == season) & (bw["player"] == player)]
            if row.empty:
                return f"No bowling record found for {player} in {season}."
            r = row.iloc[0]
            return f"{player} ({season}) - Wickets: {int(r['wickets'])}, Balls: {int(r['balls_bowled'])}, Economy: {r['economy']:.2f}"
        if "most wickets" in q:
            top = bw[bw["season"] == season].sort_values("wickets", ascending=False).head(5)
            lines = [f"{i}. {r.player} - {int(r.wickets)} wickets" for i, r in enumerate(top.itertuples(index=False), start=1)]
            return f"Most wickets in {season}:\n" + "\n".join(lines)
        if "best bowler" in q and "wicket" in q:
            r = bw[bw["season"] == season].sort_values(["wickets", "economy"], ascending=[False, True]).iloc[0]
            return f"Best bowler in {season} by wickets: {r['player']} ({int(r['wickets'])} wickets, economy {r['economy']:.2f})."
        if "best economy" in q:
            filt = bw[bw["balls_bowled"] >= 120].sort_values("economy", ascending=True).head(10)
            lines = [f"{i}. {r.player} ({int(r.season)}) - Economy {r.economy:.2f}, Balls {int(r.balls_bowled)}" for i, r in enumerate(filt.itertuples(index=False), start=1)]
            return "Best economy seasons (min 120 balls):\n" + "\n".join(lines)
        if "best bowling performance in a season" in q:
            r = bw.sort_values(["wickets", "economy"], ascending=[False, True]).iloc[0]
            return f"Best bowling season (wickets-first): {r['player']} ({int(r['season'])}) - {int(r['wickets'])} wickets, economy {r['economy']:.2f}."
        if "ipl history" in q and "wicket" in q:
            g = bw.groupby("player", as_index=False)["wickets"].sum().sort_values("wickets", ascending=False).head(5)
            lines = [f"{i}. {r.player} - {int(r.wickets)} wickets" for i, r in enumerate(g.itertuples(index=False), start=1)]
            return "Top 5 wicket takers in IPL history (dataset period):\n" + "\n".join(lines)
        return "Bowling intent detected. Try: 'Most wickets in 2021' or 'Bowling stats of Jasprit Bumrah in 2020'."

    def _answer_awards(self, q: str, season: int) -> str:
        a = self.awards.copy()
        if "orange cap" in q and "highest-paid" in q:
            rows = a[a["won_orange"] == True][["season", "highest_buy_player"]]
            if rows.empty:
                return "No season where highest-paid player won Orange Cap."
            return "Seasons where highest-paid player won Orange Cap:\n" + "\n".join([f"- {int(r.season)}: {r.highest_buy_player}" for _, r in rows.iterrows()])
        if "purple cap" in q and "highest-paid" in q:
            rows = a[a["won_purple"] == True][["season", "highest_buy_player"]]
            if rows.empty:
                return "No season where highest-paid player won Purple Cap."
            return "Seasons where highest-paid player won Purple Cap:\n" + "\n".join([f"- {int(r.season)}: {r.highest_buy_player}" for _, r in rows.iterrows()])
        if "mvp" in q and "highest-paid" in q:
            rows = a[a["won_mvp"] == True][["season", "highest_buy_player"]]
            if rows.empty:
                return "No season where highest-paid player won MVP."
            return "Seasons where highest-paid player won MVP:\n" + "\n".join([f"- {int(r.season)}: {r.highest_buy_player}" for _, r in rows.iterrows()])
        if "won any award" in q or ("list seasons" in q and "won any" in q):
            rows = a[a["won_any"] == True][["season", "highest_buy_player"]]
            if rows.empty:
                return "No season where highest-buy player won any award."
            return "Seasons where highest-buy won at least one award:\n" + "\n".join([f"- {int(r.season)}: {r.highest_buy_player}" for _, r in rows.iterrows()])
        if "compare" in q and "orange cap" in q:
            r = a[a["season"] == season]
            if r.empty:
                return f"No awards data for season {season}."
            x = r.iloc[0]
            return (
                f"{season} comparison:\n"
                f"- Highest-buy: {x['highest_buy_player']} (Rs {x['highest_buy_price_cr']} Cr)\n"
                f"- Orange Cap: {x['orange_cap']}\n"
                f"- Highest-buy runs: {int(x['buy_runs']) if pd.notna(x['buy_runs']) else 'NA'}"
            )
        return "Awards intent detected. Try: 'Did the highest-paid player win MVP?'"

    def _answer_trends(self, q: str) -> str:
        a = self.awards.copy()
        if "correlation" in q:
            corr = a[["highest_buy_price_cr", "buy_runs"]].corr().iloc[0, 1]
            direction = "positive" if corr > 0 else "negative"
            return f"Price vs runs correlation (highest-buy players): {corr:.3f} ({direction}). Insight: auction price alone is not a consistent predictor."
        if "hit rate" in q:
            rows = a[["season", "won_any"]].copy()
            lines = [f"- {int(r.season)}: {'Hit' if bool(r.won_any) else 'Miss'}" for _, r in rows.iterrows()]
            overall = rows["won_any"].mean() * 100
            return f"Hit rate by season (highest-buy won any award):\n" + "\n".join(lines) + f"\nOverall hit rate: {overall:.1f}%"
        if "era" in q and "best value" in q:
            temp = self.big_buys.copy()
            temp["era"] = temp["season"].apply(lambda s: "Early (2008-13)" if s <= 2013 else ("Middle (2014-19)" if s <= 2019 else "Modern (2020-25)"))
            g = temp.groupby("era", as_index=False)["value_score"].mean().sort_values("value_score", ascending=False)
            best = g.iloc[0]
            lines = [f"- {r.era}: {r.value_score:.2f}" for _, r in g.iterrows()]
            return "Average highest-buy value by era:\n" + "\n".join(lines) + f"\nBest era: {best['era']}."
        if "consistently top performers" in q or "expensive players consistently top performers" in q:
            top_by_season = self.values.sort_values("raw_score", ascending=False).groupby("season").head(5)
            merged = self.awards.merge(top_by_season[["season", "player"]], left_on=["season", "highest_buy_player"], right_on=["season", "player"], how="left")
            hit = merged["player"].notna().sum()
            total = len(merged)
            return f"Highest-buy in season top-5 raw performers: {hit}/{total} seasons ({(hit/total*100):.1f}%). Insight: expensive buys are not consistently top performers."
        return "Trend intent detected. Try: 'Is there a correlation between price and performance?'"

    def _answer_team(self, q: str, season: int, team: Optional[str]) -> str:
        if not team:
            return "Please mention a team name (e.g., Mumbai Indians, SRH, RCB)."

        # Limitation: processed outputs contain explicit team only for highest-buy entries.
        scoped = self.big_buys[self.big_buys["highest_buy_team"].str.lower() == team.lower()]
        if scoped.empty:
            return f"No processed team-mapped records found for {team}."

        if "top batsmen" in q:
            top = scoped.sort_values("buy_runs", ascending=False).head(5)
            lines = [f"{i}. {r.player} ({int(r.season)}) - {int(r.buy_runs) if pd.notna(r.buy_runs) else 0} runs" for i, r in enumerate(top.itertuples(index=False), start=1)]
            return f"Top batsmen in {team} (highest-buy records only):\n" + "\n".join(lines)
        if "top bowlers" in q:
            top = scoped.sort_values("buy_wickets", ascending=False).head(5)
            lines = [f"{i}. {r.player} ({int(r.season)}) - {int(r.buy_wickets) if pd.notna(r.buy_wickets) else 0} wickets" for i, r in enumerate(top.itertuples(index=False), start=1)]
            return f"Top bowlers in {team} (highest-buy records only):\n" + "\n".join(lines)
        if "best player" in q:
            one = scoped[scoped["season"] == season]
            if one.empty:
                return f"No {team} highest-buy record for season {season}."
            r = one.sort_values("raw_score", ascending=False).iloc[0]
            return f"Best player in {team} for {season} (available mapping): {r['player']} with raw score {r['raw_score']:.2f}."
        if "team-wise top performers" in q or "team wise top performers" in q:
            one = self.big_buys[self.big_buys["season"] == season].sort_values("raw_score", ascending=False)
            lines = [f"- {r.highest_buy_team}: {r.player} (raw {r.raw_score:.2f})" for _, r in one.iterrows()]
            return f"Team-wise top performers in {season} (highest-buy records only):\n" + "\n".join(lines)
        return f"Team intent detected for {team}. Note: team mapping is limited to highest-buy records in processed outputs."

    def _answer_comparison(self, query: str, season: int) -> str:
        names = re.split(r"\bvs\b", query, flags=re.IGNORECASE)
        if len(names) < 2:
            return "Please use format like: Compare Virat Kohli vs KL Rahul in 2021."
        left = self._resolve_player_fragment(names[0], season=season) if names[0] else None
        right = self._resolve_player_fragment(names[1], season=season) if names[1] else None
        if not left or not right:
            return "Could not identify both players. Please use full names as present in dataset."

        df = self.values[self.values["season"] == season]
        a = df[df["player"] == left]
        b = df[df["player"] == right]
        if a.empty or b.empty:
            return f"Comparison data missing for one/both players in {season}."
        a = a.iloc[0]
        b = b.iloc[0]
        winner = left if a["raw_score"] >= b["raw_score"] else right
        return (
            f"Comparison: {left} vs {right} ({season})\n"
            f"- {left}: Runs {int(a['total_runs'])}, Wkts {int(a['wickets'])}, Raw {a['raw_score']:.2f}\n"
            f"- {right}: Runs {int(b['total_runs'])}, Wkts {int(b['wickets'])}, Raw {b['raw_score']:.2f}\n"
            f"Insight: {winner} had higher overall impact by raw score."
        )


def print_supported_examples() -> None:
    print("\nTry queries like:")
    examples = [
        "Was the highest-paid player worth it in 2021?",
        "Which highest-buy player had the best value score?",
        "Runs scored by KL Rahul in 2021",
        "Top 5 batsmen in 2020",
        "Most wickets in 2021",
        "Bowling stats of Jasprit Bumrah in 2020",
        "Did the highest-paid player win MVP?",
        "Is there a correlation between price and performance?",
        "Top batsmen in Sunrisers Hyderabad",
        "Compare Virat Kohli vs KL Rahul in 2021",
    ]
    for e in examples:
        print(f"- {e}")


def ask_choice(prompt: str, options: List[str]) -> int:
    print(f"\n{prompt}")
    for i, opt in enumerate(options, start=1):
        print(f"{i}. {opt}")
    while True:
        raw = input("Enter choice number: ").strip()
        if raw.isdigit():
            n = int(raw)
            if 1 <= n <= len(options):
                return n
        print(f"Please enter a number between 1 and {len(options)}.")


def ask_paged_choice(prompt: str, options: List[str], page_size: int = 20) -> int:
    if not options:
        return -1
    page = 0
    total_pages = (len(options) - 1) // page_size + 1

    while True:
        start = page * page_size
        end = min(start + page_size, len(options))
        page_options = options[start:end]

        print(f"\n{prompt} (Page {page + 1}/{total_pages})")
        for i, opt in enumerate(page_options, start=1):
            print(f"{i}. {opt}")

        next_idx = len(page_options) + 1
        prev_idx = len(page_options) + 2
        cancel_idx = len(page_options) + 3

        if page < total_pages - 1:
            print(f"{next_idx}. Next page")
        if page > 0:
            print(f"{prev_idx}. Previous page")
        print(f"{cancel_idx}. Back")

        raw = input("Enter choice number: ").strip()
        if not raw.isdigit():
            print("Please enter a valid number.")
            continue
        n = int(raw)

        if 1 <= n <= len(page_options):
            return start + (n - 1)
        if n == next_idx and page < total_pages - 1:
            page += 1
            continue
        if n == prev_idx and page > 0:
            page -= 1
            continue
        if n == cancel_idx:
            return -1
        print("Invalid selection.")


def ask_season_choice(bot: IPLAuctionChatbot) -> int:
    seasons = sorted(bot.values["season"].dropna().astype(int).unique().tolist())
    labels = [str(s) for s in seasons]
    idx = ask_choice("Select season:", labels)
    return seasons[idx - 1]


def ask_player_choice(bot: IPLAuctionChatbot, season: int, mode: str) -> Optional[str]:
    if mode == "batting":
        players = sorted(bot.batting[bot.batting["season"] == season]["player"].dropna().astype(str).unique().tolist())
    elif mode == "bowling":
        players = sorted(bot.bowling[bot.bowling["season"] == season]["player"].dropna().astype(str).unique().tolist())
    else:
        players = sorted(bot.values[bot.values["season"] == season]["player"].dropna().astype(str).unique().tolist())

    idx = ask_paged_choice("Select player:", players, page_size=25)
    if idx < 0:
        return None
    return players[idx]


def menu_team_records(bot: IPLAuctionChatbot) -> None:
    team_options = sorted(bot.teams)
    team_idx = ask_choice("Select team:", team_options)
    team = team_options[team_idx - 1]
    sub = ask_choice(
        "Team Records - choose query type:",
        [
            "Top batsmen in selected team",
            "Top bowlers in selected team",
            "Best player in selected team for a season",
            "Back",
        ],
    )
    if sub == 4:
        return

    season = ask_season_choice(bot)
    if sub == 1:
        query = f"Top batsmen in {team}"
    elif sub == 2:
        query = f"Top bowlers in {team}"
    else:
        query = f"Best player in {team} for {season}"
    print("\nBot:\n" + bot.answer(query))


def menu_player_batting(bot: IPLAuctionChatbot) -> None:
    sub = ask_choice(
        "Player Records (Batting) - choose query type:",
        [
            "Runs by a player in a season",
            "Top 5 batsmen in a season",
            "Highest run scorer in a season",
            "Best strike rate players (min 100 balls)",
            "Back",
        ],
    )
    if sub == 5:
        return

    season = ask_season_choice(bot)
    if sub == 1:
        player = ask_player_choice(bot, season=season, mode="batting")
        if not player:
            return
        query = f"Runs scored by {player} in {season}"
    elif sub == 2:
        query = f"Top 5 batsmen in {season}"
    elif sub == 3:
        query = f"Highest run scorer in {season}"
    else:
        query = "Best strike rate players"
    print("\nBot:\n" + bot.answer(query))


def menu_player_bowling(bot: IPLAuctionChatbot) -> None:
    sub = ask_choice(
        "Player Records (Bowling) - choose query type:",
        [
            "Bowling stats of a player in a season",
            "Most wickets in a season",
            "Best bowler in a season (wickets)",
            "Best economy bowlers",
            "Back",
        ],
    )
    if sub == 5:
        return

    season = ask_season_choice(bot)
    if sub == 1:
        player = ask_player_choice(bot, season=season, mode="bowling")
        if not player:
            return
        query = f"Bowling stats of {player} in {season}"
    elif sub == 2:
        query = f"Most wickets in {season}"
    elif sub == 3:
        query = f"Best bowler in {season} based on wickets"
    else:
        query = "Best economy bowlers"
    print("\nBot:\n" + bot.answer(query))


def menu_auction_records(bot: IPLAuctionChatbot) -> None:
    sub = ask_choice(
        "Auction Records - choose query type:",
        [
            "Was highest-paid player worth it for a season?",
            "Best value highest-buy player",
            "Worst value highest-buy player",
            "Top 5 value-for-money highest-buys",
            "Bottom 5 overpriced highest-buys",
            "How often did highest-buy players deliver good value?",
            "Back",
        ],
    )
    if sub == 7:
        return

    if sub == 1:
        season = ask_season_choice(bot)
        query = f"Was the highest-paid player worth it in {season}?"
    elif sub == 2:
        query = "Which highest-buy player had the best value score?"
    elif sub == 3:
        query = "Which highest-buy player performed the worst?"
    elif sub == 4:
        query = "List top 5 value-for-money players in IPL history"
    elif sub == 5:
        query = "List bottom 5 overpriced players"
    else:
        query = "How often did highest-buy players deliver good value?"
    print("\nBot:\n" + bot.answer(query))


def main() -> None:
    bot = IPLAuctionChatbot()
    print("=" * 78)
    print("IPL Auction Decision Intelligence Chatbot")
    print("=" * 78)
    print("Use numbered options (no typing required).")

    while True:
        main_choice = ask_choice(
            "Main Menu:",
            [
                "Team Records",
                "Player Records - Batting",
                "Player Records - Bowling",
                "Auction Records",
                "Other (reserved for later)",
                "Exit",
            ],
        )

        try:
            if main_choice == 1:
                menu_team_records(bot)
            elif main_choice == 2:
                menu_player_batting(bot)
            elif main_choice == 3:
                menu_player_bowling(bot)
            elif main_choice == 4:
                menu_auction_records(bot)
            elif main_choice == 5:
                print("\nBot:\n'Other' is reserved. We can define this flow later.")
            else:
                print("Bot: Goodbye.")
                break
        except Exception as exc:
            print(f"\nBot:\nI hit an internal error: {exc}")


if __name__ == "__main__":
    main()
