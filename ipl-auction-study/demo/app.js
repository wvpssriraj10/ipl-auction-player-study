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
 * Season mapping: now identity since data pipeline outputs correct IPL years.
 * Awards, batting, bowling, and value data all use 2008-2025.
 * Season 2020 may have no data (IPL 2020 not in raw dataset).
 */
function awardSeasonToDataSeason(awardSeason) {
  const s = Number(awardSeason);
  if (s === 2020) return 2020; // IPL 2020
  return s;
}

function dataSeasonToAwardSeason(dataSeason) {
  return Number(dataSeason);
}

/**
 * Display-friendly season label
 */
function displaySeason(season) {
  return String(season);
}

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
 * @param {HTMLSelectElement} select
 * @param {Array} options - the values
 * @param {Function} [labelFn] - optional function to transform value -> display label
 */
function setOptions(select, options, labelFn) {
  select.innerHTML = "";
  options.forEach((opt) => {
    const el = document.createElement("option");
    el.value = String(opt);
    el.textContent = labelFn ? labelFn(opt) : String(opt);
    select.appendChild(el);
  });
}

/**
 * Fuzzy player name matching: handles abbreviated vs full names.
 * e.g. "KP Pietersen" matches "Kevin Pietersen", "MS Dhoni" matches "MS Dhoni"
 */
function playerNamesMatch(dataName, awardName) {
  if (!dataName || !awardName) return false;
  const d = String(dataName).trim().toLowerCase();
  const a = String(awardName).trim().toLowerCase();
  // Exact match
  if (d === a) return true;
  // Last name match (handles cases like "KP Pietersen" vs "Kevin Pietersen")
  const dParts = d.split(/\s+/);
  const aParts = a.split(/\s+/);
  const dLast = dParts[dParts.length - 1];
  const aLast = aParts[aParts.length - 1];
  if (dLast === aLast && dLast.length > 2) return true;
  return false;
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

/**
 * Display HTML in result box
 */
function displayHtmlResult(html) {
  resultBox.innerHTML = html;
}

/**
 * Returns player placeholder or initials
 */
function getPlayerImage(name) {
  const n = String(name).trim();
  const initials = n.split(' ').map(x => x[0]).join('').substring(0,2).toUpperCase();
  return `<div class="player-image">${initials}</div>`;
}

/**
 * Returns medal emoji for rank
 */
function getMedalEmoji(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `${rank}`;
}

/**
 * Generates HTML for a player card
 */
function renderPlayerCard(playerData, team = 'Unknown') {
  const name = playerData.player || playerData.highest_buy_player || 'Unknown Player';
  const img = getPlayerImage(name);
  
  let statsHtml = '';
  const addStat = (icon, value, label, forceShow = false) => {
    const v = num(value);
    if (v > 0 || forceShow) {
      const displayVal = (label === 'SR' || label === 'Avg' || label === 'Econ' || label === 'MVP Pts' || label === 'Value Score') 
        ? formatStats(v, (label === 'Econ' ? 2 : 1)) 
        : v;
      return `<div class="stat-item"><span class="stat-icon">${icon}</span><span class="stat-value">${displayVal}</span><span class="stat-label">${label}</span></div>`;
    }
    return '';
  };

  // Batting stats
  const runs = playerData.runs ?? playerData.total_runs ?? 0;
  statsHtml += addStat('🏃', runs, 'Runs');
  statsHtml += addStat('⚡', playerData.strike_rate || playerData.sr || 0, 'SR');
  statsHtml += addStat('📊', playerData.batting_average || playerData.avg || 0, 'Avg');

  // Bowling stats
  statsHtml += addStat('🎯', playerData.wickets || 0, 'Wickets');
  statsHtml += addStat('📈', playerData.economy || playerData.eco || 0, 'Econ');
  statsHtml += addStat('⚪', playerData.dot_balls || playerData.dotBalls || 0, 'Dots');

  // Custom MVP points
  if (playerData.totalPoints !== undefined) {
    statsHtml += addStat('⭐', playerData.totalPoints, 'MVP Pts', true);
  }
  // Custom Value Score
  if (playerData.value_score !== undefined) {
    statsHtml += addStat('💎', playerData.value_score, 'Value Score', true);
  }

  // Generate class identifying team for left border color
  // Default to first word of team name
  const tClass = team === 'Unknown' ? 'Unknown' : String(team).split(' ')[0];

  return `
    <div class="player-card ${tClass}">
      <div class="player-card-header">
        ${img}
        <div class="player-info">
          <h4>${name}</h4>
          <p>${team}</p>
        </div>
      </div>
      <div class="stats-grid">
        ${statsHtml}
      </div>
    </div>
  `;
}

/**
 * Generates HTML for an auction result card
 */
function renderAuctionResultCard(data) {
  const name = data.highest_buy_player || data.player || "Unknown Player";
  const team = data.highest_buy_team || data.team || "Unknown Team";
  const season = data.awardSeason || data.season || "";
  const verdict = getValueVerdict(num(data.value_score));
  const vClass = verdict.toLowerCase().replace(' ', '-');
  const img = getPlayerImage(name);
  
  const statsHtml = `
    <div class="stat-item"><span class="stat-icon">🏃</span><span class="stat-value">${num(data.total_runs)}</span><span class="stat-label">Runs</span></div>
    <div class="stat-item"><span class="stat-icon">⚡</span><span class="stat-value">${formatStats(data.strike_rate || data.sr)}</span><span class="stat-label">SR</span></div>
    <div class="stat-item"><span class="stat-icon">🎯</span><span class="stat-value">${num(data.wickets)}</span><span class="stat-label">Wkts</span></div>
    <div class="stat-item"><span class="stat-icon">💎</span><span class="stat-value">${formatStats(data.value_score)}</span><span class="stat-label">Value</span></div>
  `;

  const tClass = String(team).split(' ')[0];

  return `
    <div class="player-card ${tClass}">
      <div class="player-card-header">
        ${img}
        <div class="player-info">
          <div class="verdict-badge ${vClass}">${verdict}</div>
          <h4>${name} (${season})</h4>
          <div class="price-tag">${formatCurrency(data.price_cr || data.highest_buy_price_cr)}</div>
          <p>${team}</p>
        </div>
      </div>
      <div class="stats-grid">
        ${statsHtml}
      </div>
      <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
        <strong>Insight:</strong> The <strong>Value Score</strong> reveals a player's true ROI. It is calculated by dividing their on-field productivity score by their auction price (in Crores). <br>
        <em style="opacity:0.8; font-size: 12px;">Productivity Score = Batting [Runs × (Strike Rate / 100)] + Bowling [Wickets × (8 / Economy)]</em>
      </div>
    </div>
  `;
}

/**
 * Generates an HTML table from array of row objects
 */
function renderPlayersTable(players, columns) {
  let thead = '<tr><th>Rank</th>' + columns.map(c => `<th>${c.label}</th>`).join('') + '</tr>';
  let tbody = players.map((p, i) => {
    let rowHtml = `<td><span class="medal">${getMedalEmoji(i+1)}</span></td>`;
    columns.forEach(c => {
      let val = p[c.key];
      if (c.formatter) val = c.formatter(val);
      if (val === undefined || val === null) val = '-';
      rowHtml += `<td>${val}</td>`;
    });
    return `<tr>${rowHtml}</tr>`;
  }).join('');

  return `<table class="results-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================

/**
 * Update player options based on selected season and category
 */
function updatePlayers() {
  try {
    const selectedSeason = Number(seasonSelect.value);
    const category = categorySelect.value;
    // Map the selected season (from awards) to the data season
    const dataSeason = awardSeasonToDataSeason(selectedSeason);
    let list = [];

    if (dataSeason === null) {
      // No performance data for this season
      setOptions(playerSelect, ["No data for this season"]);
      return;
    }

    if (category === "Player Records - Batting") {
      list = state.batting
        .filter((r) => Number(r.season) === dataSeason)
        .map((r) => r.player);
    } else if (category === "Player Records - Bowling") {
      list = state.bowling
        .filter((r) => Number(r.season) === dataSeason)
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
 * Update team options based on selected season
 */
function updateTeams() {
  try {
    const selectedSeason = Number(seasonSelect.value);
    const dataSeason = awardSeasonToDataSeason(selectedSeason);
    
    if (dataSeason === null) {
      setOptions(teamSelect, ["No teams for this season"]);
      return;
    }

    // Extract all unique teams from batting and bowling datasets for the selected season
    const seasonTeams = new Set([
      ...state.batting.filter(r => Number(r.season) === dataSeason).map(r => r.team),
      ...state.bowling.filter(r => Number(r.season) === dataSeason).map(r => r.team)
    ]);
    
    seasonTeams.delete("Unknown");
    seasonTeams.delete(undefined);
    seasonTeams.delete(null);

    const sortedTeams = [...seasonTeams].sort();
    setOptions(teamSelect, sortedTeams.length ? sortedTeams : ["No teams found"]);
  } catch (err) {
    console.error("Error updating teams:", err);
    setOptions(teamSelect, ["N/A"]);
  }
}

/**
 * Toggle visibility of conditional fields based on category and query type
 */
function toggleFields() {
  const category = categorySelect.value;
  const qType = queryTypeSelect.value;

  wraps.team.classList.toggle("hidden", category !== "Team Records");
  
  // Single-player batting/bowling queries (must match wording in queryMap)
  const needsPlayer =
    category.startsWith("Player Records") &&
    /(of|by) a player in a season/.test(String(qType));
  wraps.player.classList.toggle("hidden", !needsPlayer);
  
  wraps.season.classList.toggle("hidden", category === "Other");
  wraps.query.classList.toggle("hidden", false);
}

/**
 * Update UI based on selected category
 */
function updateUI() {
  const category = categorySelect.value;

  // Update query type options
  setOptions(queryTypeSelect, queryMap[category] || []);

  // Set field visibilities based on category and new query type
  toggleFields();

  // Update player list if category requires it
  if (category.startsWith("Player Records")) {
    updatePlayers();
  }
  
  if (category === "Team Records") {
    updateTeams();
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
  const season = Number(seasonSelect.value); // This is awards season (2008-2025)
  const dataSeason = awardSeasonToDataSeason(season); // Map to perf data season

  const big = state.values.filter(
    (r) => r.is_big_buy === true || r.is_big_buy === "True"
  );
  // Merge big buys with awards, using the season mapping
  const merged = big.map((r) => {
    const awardSeason = dataSeasonToAwardSeason(r.season);
    const a = state.awards.find((x) => Number(x.season) === awardSeason) || {};
    return { ...r, awardSeason, ...a };
  });

  if (!merged.length) {
    displayError("No auction data available");
    return;
  }

  if (q === "Was highest-paid player worth it for a season?") {
    // Look up the value record using the DATA season (mapped from award season)
    const row = merged.find((r) => Number(r.awardSeason) === season);
    if (!row) {
      // Check if the season exists in awards but just lacks performance data
      const awardsRow = state.awards.find((a) => Number(a.season) === season);
      if (awardsRow) {
        // Show the awards info even when no performance data exists
        const runs = num(awardsRow.buy_runs);
        const wkts = num(awardsRow.buy_wickets);
        const sr = awardsRow.buy_sr;
        const eco = awardsRow.buy_economy;
        const hasPerf = runs > 0 || wkts > 0;
        displayResult(`${awardsRow.highest_buy_player} (${season}) — ${awardsRow.highest_buy_team}\n- Price: ₹${num(awardsRow.highest_buy_price_cr).toFixed(2)} Cr${hasPerf ? `\n- Runs: ${runs} | SR: ${sr ? formatStats(sr) : "N/A"}\n- Wickets: ${wkts} | Economy: ${eco ? formatStats(eco) : "N/A"}` : ""}\n\n⚠️ Detailed performance data for this player's season is not available in the dataset.\nThis may be because the player did not participate or data was not recorded.`);
      } else {
        displayResult(`No auction data found for season ${season}.`);
      }
      return;
    }
    displayHtmlResult(renderAuctionResultCard(row));
    return;
  }

  const sortedDesc = [...merged].sort(
    (a, b) => num(b.value_score) - num(a.value_score)
  );
  const sortedAsc = [...merged].sort(
    (a, b) => num(a.value_score) - num(b.value_score)
  );

  const auctionTableColumns = [
    {label: 'Season', key: 'awardSeason'},
    {label: 'Player', key: 'highest_buy_player'},
    {label: 'Team', key: 'highest_buy_team'},
    {label: 'Price', key: 'price_cr', formatter: v => formatCurrency(v)},
    {label: 'Runs', key: 'total_runs'},
    {label: 'Wkts', key: 'wickets'},
    {label: 'Score', key: 'value_score', formatter: v => formatStats(v, 1)},
    {label: 'Verdict', key: 'value_score', formatter: v => getValueVerdict(num(v))}
  ];

  if (q === "Best value highest-buy player") {
    displayHtmlResult(`<h4>💎 All-Time Best Value Buy</h4><br>${renderAuctionResultCard(sortedDesc[0])}`);
    return;
  }

  if (q === "Worst value highest-buy player") {
    displayHtmlResult(`<h4>⚠️ All-Time Worst Value Buy</h4><br>${renderAuctionResultCard(sortedAsc[0])}`);
    return;
  }

  if (q === "Top 5 value-for-money highest-buys") {
    const table = renderPlayersTable(sortedDesc.slice(0, 5), auctionTableColumns);
    displayHtmlResult(`<h4>📈 Top 5 Best Value Buys</h4><br>${table}`);
    return;
  }

  if (q === "Bottom 5 overpriced highest-buys") {
    const table = renderPlayersTable(sortedAsc.slice(0, 5), auctionTableColumns);
    displayHtmlResult(`<h4>📉 Top 5 Most Overpriced Buys</h4><br>${table}`);
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
  const selectedSeason = Number(seasonSelect.value);
  const dataSeason = awardSeasonToDataSeason(selectedSeason);
  const player = playerSelect.value;

  if (dataSeason === null) {
    displayResult(`No batting data available for season ${selectedSeason}.\n\n⚠️ Performance data for this IPL season is not present in the dataset.`);
    return;
  }

  const rows = state.batting.filter((r) => Number(r.season) === dataSeason);

  if (!rows.length) {
    displayResult(`No batting data available for season ${selectedSeason}`);
    return;
  }

  if (q === "Runs by a player in a season") {
    if (
      !player ||
      player === "No players found" ||
      player === "No data for this season"
    ) {
      displayResult("Select a player from the Player dropdown, then run the query.");
      return;
    }
    const r = rows.find((x) => String(x.player) === player);
    if (!r) {
      displayResult(`No batting record found for ${player} in ${selectedSeason}.`);
      return;
    }
    displayHtmlResult(renderPlayerCard(r, r.team));
    return;
  }

  if (q === "Top 5 batsmen in a season") {
    const top5 = [...rows].sort((a, b) => num(b.total_runs) - num(a.total_runs)).slice(0, 5);
    const table = renderPlayersTable(top5, [
      {label: 'Player', key: 'player'},
      {label: 'Team', key: 'team'},
      {label: 'Runs', key: 'total_runs'},
      {label: 'Average', key: 'batting_average', formatter: v => formatStats(v, 2)},
      {label: 'SR', key: 'strike_rate', formatter: v => formatStats(v, 1)}
    ]);
    displayHtmlResult(`<h4>🏏 Top 5 Batsmen (${selectedSeason})</h4><br>${table}`);
    return;
  }

  if (q === "Highest run scorer in a season") {
    const r = [...rows].sort((a, b) => num(b.total_runs) - num(a.total_runs))[0];
    if (r) {
      displayHtmlResult(`<h4>👑 Season Leader (${selectedSeason})</h4><br>${renderPlayerCard(r, r.team)}`);
    } else {
      displayResult("No data.");
    }
    return;
  }

  if (q === "Best strike rate players (min 100 balls)") {
    const filtered = rows
      .filter((r) => num(r.balls_faced) >= 100)
      .sort((a, b) => num(b.strike_rate) - num(a.strike_rate))
      .slice(0, 10);
    
    if (!filtered.length) {
      displayResult(`No batsmen with 100+ balls faced found in ${selectedSeason}.`);
      return;
    }

    const table = renderPlayersTable(filtered, [
      {label: 'Player', key: 'player'},
      {label: 'SR', key: 'strike_rate', formatter: v => formatStats(v, 1)},
      {label: 'Runs', key: 'total_runs'},
      {label: 'Balls', key: 'balls_faced'},
      {label: 'Avg', key: 'batting_average', formatter: v => formatStats(v, 2)}
    ]);
    displayHtmlResult(`<h4>🚀 Strike Rate Leaders (100+ Balls) - ${selectedSeason}</h4><br>${table}`);
    return;
  }
}

/**
 * Execute bowling records query
 */
function handleBowlingQuery() {
  const q = queryTypeSelect.value;
  const selectedSeason = Number(seasonSelect.value);
  const dataSeason = awardSeasonToDataSeason(selectedSeason);
  const player = playerSelect.value;

  if (dataSeason === null) {
    displayResult(`No bowling data available for season ${selectedSeason}.\n\n⚠️ Performance data for this IPL season is not present in the dataset.`);
    return;
  }

  const rows = state.bowling.filter((r) => Number(r.season) === dataSeason);

  if (!rows.length) {
    displayResult(`No bowling data available for season ${selectedSeason}`);
    return;
  }

  if (q === "Bowling stats of a player in a season") {
    if (
      !player ||
      player === "No players found" ||
      player === "No data for this season"
    ) {
      displayResult("Select a player from the Player dropdown, then run the query.");
      return;
    }
    const r = rows.find((x) => String(x.player) === player);
    if (!r) {
      displayResult(`No bowling record found for ${player} in ${selectedSeason}.`);
      return;
    }
    displayHtmlResult(renderPlayerCard(r, r.team));
    return;
  }

  if (q === "Most wickets in a season") {
    const top5 = [...rows].sort((a, b) => num(b.wickets) - num(a.wickets)).slice(0, 10);
    const table = renderPlayersTable(top5, [
      {label: 'Player', key: 'player'},
      {label: 'Team', key: 'team'},
      {label: 'Wickets', key: 'wickets'},
      {label: 'Econ', key: 'economy', formatter: v => formatStats(v, 2)},
      {label: 'Avg', key: 'bowling_average', formatter: v => formatStats(v, 2)},
      {label: 'SR', key: 'bowling_strike_rate', formatter: v => formatStats(v, 1)},
      {label: 'Dots', key: 'dot_balls'}
    ]);
    displayHtmlResult(`<h4>🎯 Wicket Leaders (${selectedSeason})</h4><br>${table}`);
    return;
  }

  if (q === "Best bowler in a season (wickets)") {
    const r = [...rows].sort((a, b) => num(b.wickets) - num(a.wickets))[0];
    if (r) {
      displayHtmlResult(`<h4>🏆 Top Wicket Taker (${selectedSeason})</h4><br>${renderPlayerCard(r, r.team)}`);
    } else {
      displayResult("No data.");
    }
    return;
  }

  if (q === "Best economy bowlers") {
    const filtered = rows
      .filter((r) => num(r.balls_bowled) >= 60)
      .sort((a, b) => num(a.economy) - num(b.economy))
      .slice(0, 10);
    
    if (!filtered.length) {
      displayResult(`No bowlers with 60+ legal balls found in ${selectedSeason}.`);
      return;
    }

    const table = renderPlayersTable(filtered, [
      {label: 'Player', key: 'player'},
      {label: 'Econ', key: 'economy', formatter: v => formatStats(v, 2)},
      {label: 'Wickets', key: 'wickets'},
      {label: 'Dots', key: 'dot_balls'}
    ]);
    displayHtmlResult(`<h4>🧤 Economy Specials (Min 10 Overs) - ${selectedSeason}</h4><br>${table}`);
    return;
  }
}

/**
 * Execute team records query
 * We have team columns directly in batting/bowling aggregates.
 */
function handleTeamQuery() {
  const q = queryTypeSelect.value;
  const team = teamSelect.value; // e.g. "Chennai Super Kings"
  const selectedSeason = Number(seasonSelect.value);

  // Maps full team names to arrays of possible acronyms used in the awards dataset
  const getAwardAcronyms = (fullTeam) => {
    const mapping = {
      "Chennai Super Kings": ["CSK"],
      "Deccan Chargers": ["DC"],
      "Delhi Capitals": ["DD", "DC"], // Awards uses DD even for DC
      "Gujarat Lions": ["GL"],
      "Gujarat Titans": ["GT"],
      "Kochi Tuskers Kerala": ["KTK"],
      "Kolkata Knight Riders": ["KKR"],
      "Lucknow Super Giants": ["LSG"],
      "Mumbai Indians": ["MI"],
      "Pune Warriors": ["PWI"],
      "Punjab Kings": ["PBKS", "KXIP"],
      "Rajasthan Royals": ["RR"],
      "Rising Pune Supergiant": ["RPS"],
      "Royal Challengers Bengaluru": ["RCB"],
      "Sunrisers Hyderabad": ["SRH"]
    };
    return mapping[fullTeam] || [fullTeam.substring(0, 3).toUpperCase()];
  };

  if (q === "Top batsmen in selected team") {
    const dataSeason = awardSeasonToDataSeason(selectedSeason);
    if (!dataSeason) {
      displayResult(`No performance data available for ${selectedSeason}.`);
      return;
    }
    const rows = state.batting.filter(r => Number(r.season) === dataSeason && String(r.team) === team);
    if (!rows.length) {
      displayResult(`No batting data found for ${team} in ${selectedSeason}.`);
      return;
    }
    const topBatsmen = [...rows].sort((a, b) => num(b.total_runs) - num(a.total_runs)).slice(0, 5);
    const tblHtml = renderPlayersTable(topBatsmen, [
      { label: 'Player', key: 'player' },
      { label: 'Runs', key: 'total_runs' },
      { label: 'SR', key: 'strike_rate', formatter: v => formatStats(v, 1) },
      { label: 'Avg', key: 'batting_average', formatter: v => formatStats(v, 1) },
      { label: 'Sixes', key: 'sixes' }
    ]);
    const headerHtml = `<h4>🏏 Top batsmen for ${team} in ${selectedSeason}</h4><br>`;
    displayHtmlResult(headerHtml + tblHtml);
    return;
  }

  if (q === "Top bowlers in selected team") {
    const dataSeason = awardSeasonToDataSeason(selectedSeason);
    if (!dataSeason) {
      displayResult(`No performance data available for ${selectedSeason}.`);
      return;
    }
    const rows = state.bowling.filter(r => Number(r.season) === dataSeason && String(r.team) === team);
    if (!rows.length) {
      displayResult(`No bowling data found for ${team} in ${selectedSeason}.`);
      return;
    }
    const topBowlers = [...rows].sort((a, b) => num(b.wickets) - num(a.wickets)).slice(0, 5);
    const tblHtml = renderPlayersTable(topBowlers, [
      { label: 'Player', key: 'player' },
      { label: 'Wickets', key: 'wickets' },
      { label: 'Econ', key: 'economy', formatter: v => formatStats(v, 2) },
      { label: 'SR', key: 'bowling_strike_rate', formatter: v => formatStats(v, 1) },
      { label: 'Dots', key: 'dot_balls' }
    ]);
    const headerHtml = `<h4>🎯 Top bowlers for ${team} in ${selectedSeason}</h4><br>`;
    displayHtmlResult(headerHtml + tblHtml);
    return;
  }

  if (q === "Best player in selected team for a season") {
    const dataSeason = awardSeasonToDataSeason(selectedSeason);
    if (!dataSeason) {
      displayResult(`No performance data available for ${selectedSeason}.`);
      return;
    }

    // Get all players who played for this team this season
    const teamBatting = state.batting.filter(r => Number(r.season) === dataSeason && String(r.team) === team);
    const teamBowling = state.bowling.filter(r => Number(r.season) === dataSeason && String(r.team) === team);

    const players = new Set([...teamBatting.map(r => r.player), ...teamBowling.map(r => r.player)]);
    
    if (players.size === 0) {
      displayResult(`No players found for ${team} in ${selectedSeason}.`);
      return;
    }

    const mvpList = Array.from(players).map(player => {
      const batStat = teamBatting.find(r => r.player === player) || {};
      const bowlStat = teamBowling.find(r => r.player === player) || {};
      
      const wickets = num(bowlStat.wickets) || 0;
      const sixes = num(batStat.sixes) || 0;
      const fours = num(batStat.fours) || 0;
      const dotBalls = num(bowlStat.dot_balls) || 0;
      
      // Calculate points based on standard IPL MVP system
      const ptsWickets = wickets * 3.5;
      const ptsSixes = sixes * 3.5;
      const ptsFours = fours * 2.5;
      const ptsDots = dotBalls * 1.0;
      // Catch/Stumping = 2.5 pts (excluded as raw data lacks fielder identification)
      
      const totalPoints = ptsWickets + ptsSixes + ptsFours + ptsDots;

      return {
        player,
        wickets, sixes, fours, dotBalls,
        totalPoints,
        economy: num(bowlStat.economy) || 0,
        runs: num(batStat.total_runs) || 0,
        avg: num(batStat.batting_average) || 0,
        sr: num(batStat.strike_rate) || 0
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);

    const mvp = mvpList[0];
    
    const headerHtml = `<h4 style="margin-bottom: 20px; color: var(--white); font-family: 'Archivo', sans-serif;">⭐ Most Valuable Player (MVP) for ${team} in ${selectedSeason}</h4>`;
    let htmlResult = headerHtml + renderPlayerCard(mvp, team);

    if (mvpList.length > 1) {
      htmlResult += `<h5 style="margin-top: 24px; margin-bottom: 12px; color: var(--muted); font-size: 13px; text-transform: uppercase;">Runners-up Ranking</h5>`;
      htmlResult += renderPlayersTable(mvpList.slice(1, 5), [
        {label: 'Player', key: 'player'},
        {label: 'Wickets', key: 'wickets'},
        {label: 'Sixes', key: 'sixes'},
        {label: 'Fours', key: 'fours'},
        {label: 'Dots', key: 'dotBalls'},
        {label: 'MVP Pts', key: 'totalPoints', formatter: v => formatStats(v, 1)}
      ]);
    }
    
    htmlResult += `<p style="margin-top: 16px; font-size: 11px; color: rgba(255,255,255,0.3);">(Note: Points based on 2024 standards. Fielding stats currently excluded).</p>`;

    displayHtmlResult(htmlResult);
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
    const hit = state.awards.filter(
      (r) => r.won_any === true || r.won_any === "True"
    ).length;
    const hitRate = seasons.length ? (hit / seasons.length) * 100 : 0;

    statSeasons.textContent = `${seasons.length}`;
    statPlayers.textContent = `${players.length}`;
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
  // Run before data load so the page is not stuck at opacity:0 if fetch fails (e.g. missing CSV on host)
  setupRevealAnimations();
  applyScrollEffects();

  try {
    state.isLoading = true;
    displayResult("Loading data...");

    // Load all required datasets
    const [batting, bowling, values, awards] = await Promise.all([
      loadCSV("/data/processed/batting_agg.csv"),
      loadCSV("/data/processed/bowling_agg.csv"),
      loadCSV("/data/processed/player_value_scores.csv"),
      loadCSV("/data/processed/ipl_awards_prices.csv"),
    ]);

    // Populate state
    state.batting = batting;
    state.bowling = bowling;
    state.values = values;
    state.awards = awards;
    // Use awards seasons (2008-2025) as the canonical season list
    // This ensures all IPL seasons are available, even if batting/bowling data is missing
    state.seasons = [...new Set(awards.map((r) => Number(r.season)))].sort(
      (a, b) => a - b
    );
    
    // Add all distinct valid teams from batting and bowling datasets
    const allTeams = new Set([
      ...batting.map(r => r.team),
      ...bowling.map(r => r.team)
    ]);
    allTeams.delete("Unknown");
    allTeams.delete(undefined);
    allTeams.delete(null);

    state.teams = [...allTeams].sort();

    // Update UI — season dropdown uses awards seasons (2008-2025)
    setOptions(seasonSelect, state.seasons);
    setOptions(teamSelect, state.teams);
    updateUI();
    updatePlayers();
    updateTeams();
    renderTopNumbers();

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

// Query type change listener
queryTypeSelect.addEventListener("change", () => {
  toggleFields();
  if (categorySelect.value.startsWith("Player Records")) {
    updatePlayers();
  }
});

// Season change listener
seasonSelect.addEventListener("change", () => {
  updatePlayers();
  updateTeams();
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
