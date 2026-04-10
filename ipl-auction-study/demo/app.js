// ============================================
// DOM ELEMENT REFERENCES
// ============================================
const categorySelect = document.getElementById("categorySelect");
const queryTypeSelect = document.getElementById("queryTypeSelect");
const teamSelect = document.getElementById("teamSelect");
const seasonSelect = document.getElementById("seasonSelect");
const playerSelect = document.getElementById("playerSelect");
const resultBox = document.getElementById("resultBox");
const queryForm = document.getElementById("queryForm");
const runBtn = document.getElementById("runBtn");

// Label wrapper references for conditional visibility
const wraps = {
  query: document.getElementById("queryTypeWrap"),
  team: document.getElementById("teamWrap"),
  season: document.getElementById("seasonWrap"),
  player: document.getElementById("playerWrap"),
};

// Statistics display elements
const statSeasons = document.getElementById("statSeasons");
const statPlayers = document.getElementById("statPlayers");
const statDeliveries = document.getElementById("statDeliveries");
const statHitRate = document.getElementById("statHitRate");

// ============================================
// APPLICATION STATE
// ============================================
const state = {
  batting: [],
  bowling: [],
  values: [],
  awards: [],
  seasons: [],
  teams: [],
  isLoading: true,
  hasError: false,
};

// ============================================
// QUERY CONFIGURATION
// ============================================
const queryMap = {
  "Team Records": [
    "Top batsmen in selected team",
    "Top bowlers in selected team",
    "Best player in selected team for a season",
  ],
  "Player Records - Batting": [
    "Runs by a player in a season",
    "Top 5 batsmen in a season",
    "Highest run scorer in a season",
    "Best strike rate players (min 100 balls)",
  ],
  "Player Records - Bowling": [
    "Bowling stats of a player in a season",
    "Most wickets in a season",
    "Best bowler in a season (wickets)",
    "Best economy bowlers",
  ],
  "Auction Records": [
    "Was highest-paid player worth it for a season?",
    "Best value highest-buy player",
    "Worst value highest-buy player",
    "Top 5 value-for-money highest-buys",
    "Bottom 5 overpriced highest-buys",
    "How often did highest-buy players deliver good value?",
  ],
  "Other": ["Reserved for later"],
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Parse CSV data using PapaParse
 */
function parseCSV(text) {
  return Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  }).data;
}

/**
 * Load CSV file from given path
 */
async function loadCSV(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.statusText}`);
  const txt = await res.text();
  return parseCSV(txt);
}

/**
 * Set options in a select element
 */
function setOptions(select, options) {
  select.innerHTML = "";
  options.forEach((opt) => {
    const el = document.createElement("option");
    el.value = String(opt);
    el.textContent = String(opt);
    select.appendChild(el);
  });
}

/**
 * Determine value verdict based on score
 */
function getValueVerdict(v) {
  if (v >= 30) return "High Value";
  if (v >= 15) return "Average";
  return "Overpriced";
}

/**
 * Safely convert to number with fallback
 */
function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Display message in result box
 */
function displayResult(message) {
  resultBox.textContent = message;
}

/**
 * Display error message
 */
function displayError(message) {
  displayResult(`❌ Error: ${message}`);
  console.error(message);
}

/**
 * Format number as currency (Indian rupees)
 */
function formatCurrency(value) {
  return `₹${num(value).toFixed(2)} Cr`;
}

/**
 * Format stats with proper decimal places
 */
function formatStats(value, decimals = 2) {
  return num(value).toFixed(decimals);
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================

/**
 * Update player options based on selected season and category
 */
function updatePlayers() {
  try {
    const season = Number(seasonSelect.value);
    const category = categorySelect.value;
    let list = [];

    if (category === "Player Records - Batting") {
      list = state.batting
        .filter((r) => Number(r.season) === season)
        .map((r) => r.player);
    } else if (category === "Player Records - Bowling") {
      list = state.bowling
        .filter((r) => Number(r.season) === season)
        .map((r) => r.player);
    }

    list = [...new Set(list)].sort((a, b) =>
      String(a).localeCompare(String(b))
    );
    setOptions(playerSelect, list.length ? list : ["No players found"]);
  } catch (err) {
    console.error("Error updating players:", err);
    setOptions(playerSelect, ["N/A"]);
  }
}

/**
 * Update UI based on selected category
 */
function updateUI() {
  const category = categorySelect.value;

  // Update query type options
  setOptions(queryTypeSelect, queryMap[category] || []);

  // Toggle visibility of conditional fields
  wraps.team.classList.toggle("hidden", category !== "Team Records");
  wraps.player.classList.toggle(
    "hidden",
    !category.startsWith("Player Records")
  );
  wraps.season.classList.toggle("hidden", category === "Other");
  wraps.query.classList.toggle("hidden", false);

  // Update player list if category requires it
  if (category.startsWith("Player Records")) {
    updatePlayers();
  }
}

// ============================================
// QUERY EXECUTION FUNCTIONS
// ============================================

/**
 * Execute auction records query
 */
function handleAuctionQuery() {
  const q = queryTypeSelect.value;
  const season = Number(seasonSelect.value);

  const big = state.values.filter(
    (r) => r.is_big_buy === true || r.is_big_buy === "True"
  );
  const merged = big.map((r) => {
    const a = state.awards.find((x) => Number(x.season) === Number(r.season)) || {};
    return { ...r, ...a };
  });

  if (!merged.length) {
    displayError("No auction data available");
    return;
  }

  if (q === "Was highest-paid player worth it for a season?") {
    const row = merged.find((r) => Number(r.season) === season);
    if (!row) {
      displayResult(`No data for season ${season}`);
      return;
    }
    displayResult(`${row.highest_buy_player} (${season})
- Price: ${formatCurrency(row.price_cr)}
- Runs: ${num(row.buy_runs)} | SR: ${formatStats(row.buy_sr)}
- Wickets: ${num(row.buy_wickets)} | Economy: ${formatStats(row.buy_economy)}
- Value Score: ${formatStats(row.value_score)}

Verdict: ${getValueVerdict(num(row.value_score))}
Insight: Combined batting + bowling contribution against auction price.`);
    return;
  }

  const sortedDesc = [...merged].sort(
    (a, b) => num(b.value_score) - num(a.value_score)
  );
  const sortedAsc = [...merged].sort(
    (a, b) => num(a.value_score) - num(b.value_score)
  );

  if (q === "Best value highest-buy player") {
    const r = sortedDesc[0];
    displayResult(
      `Best value highest-buy: ${r.player} (${r.season}) with value score ${formatStats(r.value_score)}.`
    );
    return;
  }

  if (q === "Worst value highest-buy player") {
    const r = sortedAsc[0];
    displayResult(
      `Worst value highest-buy: ${r.player} (${r.season}) with value score ${formatStats(r.value_score)}.`
    );
    return;
  }

  if (q === "Top 5 value-for-money highest-buys") {
    displayResult(
      sortedDesc
        .slice(0, 5)
        .map((r, i) => `${i + 1}. ${r.player} (${r.season}) - ${formatStats(r.value_score)}`)
        .join("\n")
    );
    return;
  }

  if (q === "Bottom 5 overpriced highest-buys") {
    displayResult(
      sortedAsc
        .slice(0, 5)
        .map((r, i) => `${i + 1}. ${r.player} (${r.season}) - ${formatStats(r.value_score)}`)
        .join("\n")
    );
    return;
  }

  if (q === "How often did highest-buy players deliver good value?") {
    const labels = merged.map((r) => getValueVerdict(num(r.value_score)));
    const high = labels.filter((x) => x === "High Value").length;
    const avg = labels.filter((x) => x === "Average").length;
    const low = labels.filter((x) => x === "Overpriced").length;
    displayResult(`Distribution across ${labels.length} seasons:
- High Value: ${high}
- Average: ${avg}
- Overpriced: ${low}`);
    return;
  }
}

/**
 * Execute batting records query
 */
function handleBattingQuery() {
  const q = queryTypeSelect.value;
  const season = Number(seasonSelect.value);
  const player = playerSelect.value;

  const rows = state.batting.filter((r) => Number(r.season) === season);

  if (!rows.length) {
    displayResult(`No batting data available for season ${season}`);
    return;
  }

  if (q === "Runs by a player in a season") {
    const r = rows.find((x) => String(x.player) === player);
    displayResult(
      r
        ? `${player} (${season})\n- Runs: ${num(r.total_runs)}\n- Balls: ${num(r.balls_faced)}\n- Strike Rate: ${formatStats(r.strike_rate)}`
        : `No batting record found for ${player} in ${season}.`
    );
    return;
  }

  if (q === "Top 5 batsmen in a season") {
    displayResult(
      [...rows]
        .sort((a, b) => num(b.total_runs) - num(a.total_runs))
        .slice(0, 5)
        .map((r, i) => `${i + 1}. ${r.player} - ${num(r.total_runs)} runs`)
        .join("\n")
    );
    return;
  }

  if (q === "Highest run scorer in a season") {
    const r = [...rows].sort(
      (a, b) => num(b.total_runs) - num(a.total_runs)
    )[0];
    displayResult(
      r
        ? `Highest run scorer in ${season}: ${r.player} (${num(r.total_runs)} runs).`
        : "No data."
    );
    return;
  }

  if (q === "Best strike rate players (min 100 balls)") {
    displayResult(
      rows
        .filter((r) => num(r.balls_faced) >= 100)
        .sort((a, b) => num(b.strike_rate) - num(a.strike_rate))
        .slice(0, 10)
        .map(
          (r, i) =>
            `${i + 1}. ${r.player} - SR ${formatStats(r.strike_rate)}, Balls ${num(r.balls_faced)}`
        )
        .join("\n")
    );
    return;
  }
}

/**
 * Execute bowling records query
 */
function handleBowlingQuery() {
  const q = queryTypeSelect.value;
  const season = Number(seasonSelect.value);
  const player = playerSelect.value;

  const rows = state.bowling.filter((r) => Number(r.season) === season);

  if (!rows.length) {
    displayResult(`No bowling data available for season ${season}`);
    return;
  }

  if (q === "Bowling stats of a player in a season") {
    const r = rows.find((x) => String(x.player) === player);
    displayResult(
      r
        ? `${player} (${season})\n- Wickets: ${num(r.wickets)}\n- Balls: ${num(r.balls_bowled)}\n- Economy: ${formatStats(r.economy)}`
        : `No bowling record found for ${player} in ${season}.`
    );
    return;
  }

  if (q === "Most wickets in a season") {
    displayResult(
      [...rows]
        .sort((a, b) => num(b.wickets) - num(a.wickets))
        .slice(0, 5)
        .map((r, i) => `${i + 1}. ${r.player} - ${num(r.wickets)} wickets`)
        .join("\n")
    );
    return;
  }

  if (q === "Best bowler in a season (wickets)") {
    const r = [...rows].sort(
      (a, b) => num(b.wickets) - num(a.wickets) || num(a.economy) - num(b.economy)
    )[0];
    displayResult(
      r
        ? `Best bowler in ${season}: ${r.player} (${num(r.wickets)} wickets, economy ${formatStats(r.economy)}).`
        : "No data."
    );
    return;
  }

  if (q === "Best economy bowlers") {
    displayResult(
      rows
        .filter((r) => num(r.balls_bowled) >= 120)
        .sort((a, b) => num(a.economy) - num(b.economy))
        .slice(0, 10)
        .map(
          (r, i) =>
            `${i + 1}. ${r.player} - Economy ${formatStats(r.economy)}, Balls ${num(r.balls_bowled)}`
        )
        .join("\n")
    );
    return;
  }
}

/**
 * Execute team records query
 */
function handleTeamQuery() {
  const q = queryTypeSelect.value;
  const team = teamSelect.value;
  const season = Number(seasonSelect.value);

  const big = state.values.filter(
    (r) => r.is_big_buy === true || r.is_big_buy === "True"
  );
  const merged = big.map((r) => {
    const a = state.awards.find((x) => Number(x.season) === Number(r.season)) || {};
    return { ...r, ...a };
  });
  const scoped = merged.filter(
    (r) => String(r.highest_buy_team || "").toLowerCase() === String(team).toLowerCase()
  );

  if (!scoped.length) {
    displayResult(`No processed team-mapped records found for ${team}.`);
    return;
  }

  if (q === "Top batsmen in selected team") {
    displayResult(
      [...scoped]
        .sort((a, b) => num(b.buy_runs) - num(a.buy_runs))
        .slice(0, 5)
        .map((r, i) => `${i + 1}. ${r.player} (${r.season}) - ${num(r.buy_runs)} runs`)
        .join("\n")
    );
    return;
  }

  if (q === "Top bowlers in selected team") {
    displayResult(
      [...scoped]
        .sort((a, b) => num(b.buy_wickets) - num(a.buy_wickets))
        .slice(0, 5)
        .map((r, i) => `${i + 1}. ${r.player} (${r.season}) - ${num(r.buy_wickets)} wickets`)
        .join("\n")
    );
    return;
  }

  if (q === "Best player in selected team for a season") {
    const one = scoped
      .filter((r) => Number(r.season) === season)
      .sort((a, b) => num(b.raw_score) - num(a.raw_score))[0];
    displayResult(
      one
        ? `Best player in ${team} for ${season}: ${one.player} with raw score ${formatStats(one.raw_score)}.`
        : `No ${team} highest-buy record for ${season}.`
    );
    return;
  }
}

/**
 * Main query runner
 */
function runQuery() {
  try {
    const category = categorySelect.value;

    if (category === "Other") {
      displayResult("Other is reserved for future expansion.");
      return;
    }

    if (!state.batting.length && !state.awards.length) {
      displayError("Data not loaded. Please wait and try again.");
      return;
    }

    if (category === "Auction Records") {
      handleAuctionQuery();
    } else if (category === "Player Records - Batting") {
      handleBattingQuery();
    } else if (category === "Player Records - Bowling") {
      handleBowlingQuery();
    } else if (category === "Team Records") {
      handleTeamQuery();
    } else {
      displayResult("No matching query handler found.");
    }
  } catch (err) {
    displayError(`Query execution failed: ${err.message}`);
  }
}

// ============================================
// ANIMATION & SCROLL FUNCTIONS
// ============================================

/**
 * Apply parallax effect to video
 */
function applyScrollEffects() {
  const parallaxEls = document.querySelectorAll(".parallax");
  const y = window.scrollY || 0;
  parallaxEls.forEach((el) => {
    el.style.transform = `translateY(${y * 0.15}px) scale(1.06)`;
  });
}

/**
 * Setup intersection observer for reveal animations
 */
function setupRevealAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          // Optionally unobserve after animation completes
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
  );

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
}

// ============================================
// STATISTICS RENDERING
// ============================================

/**
 * Render key statistics
 */
function renderTopNumbers() {
  try {
    const seasons = [...new Set(state.awards.map((r) => Number(r.season)))];
    const players = [...new Set(state.values.map((r) => r.player))];
    const playerSeasons = state.values.length;
    const hit = state.awards.filter(
      (r) => r.won_any === true || r.won_any === "True"
    ).length;
    const hitRate = seasons.length ? (hit / seasons.length) * 100 : 0;

    statSeasons.textContent = `${seasons.length}`;
    statPlayers.textContent = `${players.length}`;
    statDeliveries.textContent = `${playerSeasons}`;
    statHitRate.textContent = `${hitRate.toFixed(1)}`;
  } catch (err) {
    console.error("Error rendering statistics:", err);
  }
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize application
 */
async function init() {
  try {
    state.isLoading = true;
    displayResult("Loading data...");

    // Load all required datasets
    const [batting, bowling, values, awards] = await Promise.all([
      loadCSV("../data/processed/batting_agg.csv"),
      loadCSV("../data/processed/bowling_agg.csv"),
      loadCSV("../data/processed/player_value_scores.csv"),
      loadCSV("../data/processed/ipl_awards_prices.csv"),
    ]);

    // Populate state
    state.batting = batting;
    state.bowling = bowling;
    state.values = values;
    state.awards = awards;
    state.seasons = [...new Set(values.map((r) => Number(r.season)))].sort(
      (a, b) => a - b
    );
    state.teams = [
      ...new Set(awards.map((r) => r.highest_buy_team).filter(Boolean)),
    ].sort();

    // Update UI
    setOptions(seasonSelect, state.seasons);
    setOptions(teamSelect, state.teams);
    updateUI();
    renderTopNumbers();
    setupRevealAnimations();
    applyScrollEffects();

    state.isLoading = false;
    state.hasError = false;
    displayResult("✅ Data loaded successfully. Choose options and click Run Query.");
  } catch (err) {
    state.isLoading = false;
    state.hasError = true;
    displayError(`Initialization failed: ${err.message}`);
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

// Category change listener
categorySelect.addEventListener("change", () => {
  updateUI();
  displayResult("Category changed. Select query type and run query.");
});

// Season change listener
seasonSelect.addEventListener("change", () => {
  updatePlayers();
});

// Form submission handler
queryForm.addEventListener("submit", (e) => {
  e.preventDefault();
  runQuery();
});

// Run button click listener
runBtn.addEventListener("click", runQuery);

// Scroll effects listener (passive for performance)
window.addEventListener("scroll", applyScrollEffects, { passive: true });

// ============================================
// APPLICATION START
// ============================================
document.addEventListener("DOMContentLoaded", init);
