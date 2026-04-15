// ============================================
// DOM ELEMENT REFERENCES
// ============================================
const categorySelect = document.getElementById("categorySelect");
const queryTypeSelect = document.getElementById("queryTypeSelect");
const teamSelect = document.getElementById("teamSelect");
const seasonSelect = document.getElementById("seasonSelect");
const playerInput = document.getElementById("playerInput");
const playerSuggestionsList = document.getElementById("playerSuggestionsList");
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

/** Canonical player names for the active season + batting/bowling category (for autocomplete). */
let playerNamesList = [];
let playerSuggestActiveIndex = -1;
const MAX_PLAYER_SUGGESTIONS = 12;
let pulseChartInstance = null;
const analyticsSlot = document.getElementById("analyticsSlot");

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
    "Top 10 batsmen in a season",
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
    "Top 10 value-for-money highest-buys",
    "Bottom 10 overpriced highest-buys",
    "How often did highest-buy players deliver good value?",
  ],
  "Other": ["Reserved for later"],
};

/** Rows to show for ranked list queries (tables). */
const TABLE_TOP_N = 10;

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
 * CSV rows use present-day franchise names for every season. Remap to the brand used that IPL year.
 * Matching/filters still use raw `team` from data — only user-facing labels change.
 */
function displayTeamName(team, season) {
  if (team == null || team === "") return team;
  const y = Number(season);
  if (!Number.isFinite(y)) return String(team);
  const t = String(team);
  if (t === "Sunrisers Hyderabad" && y <= 2012) return "Deccan Chargers";
  if (t === "Delhi Capitals" && y <= 2018) return "Delhi Daredevils";
  if (t === "Punjab Kings" && y <= 2020) return "Kings XI Punjab";
  if (t === "Royal Challengers Bengaluru" && y <= 2023) {
    return "Royal Challengers Bangalore";
  }
  return t;
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
 * Destroys existing chart instance
 */
function destroyPulseChart() {
  if (pulseChartInstance) {
    pulseChartInstance.destroy();
    pulseChartInstance = null;
  }
}

/**
 * Renders a "Performance Pulse" chart for a player across all seasons.
 */
function renderPlayerPulseChart(playerName, dataType = 'runs') {
  destroyPulseChart();
  analyticsSlot.classList.remove("hidden");
  
  const label = dataType === 'runs' ? 'Runs Scored' : 'Wickets Taken';
  const dataSrc = dataType === 'runs' ? state.batting : state.bowling;
  const dataKey = dataType === 'runs' ? 'total_runs' : 'wickets';
  const color = dataType === 'runs' ? '#a78bfa' : '#60a5fa';

  // Extract season data for the player
  const history = dataSrc
    .filter(r => String(r.player) === playerName)
    .sort((a,b) => Number(a.season) - Number(b.season));

  if (history.length < 2) {
    // Only one season or no data, hide chart area
    analyticsSlot.classList.add("hidden");
    return;
  }

  const labels = history.map(h => h.season);
  const values = history.map(h => num(h[dataKey]));

  const ctx = document.getElementById('pulseChart').getContext('2d');
  
  pulseChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: values,
        borderColor: color,
        backgroundColor: 'transparent',
        borderWidth: 3,
        pointBackgroundColor: color,
        pointBorderColor: '#000',
        pointBorderWidth: 2,
        pointRadius: 5,
        tension: 0.35,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10, 10, 15, 0.9)',
          titleFont: { family: 'Archivo', size: 14 },
          bodyFont: { family: 'Inter', size: 13 },
          padding: 12,
          borderColor: 'rgba(139, 92, 246, 0.3)',
          borderWidth: 1
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: 'rgba(255, 255, 255, 0.5)', font: { size: 11 } }
        },
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: 'rgba(255, 255, 255, 0.5)', font: { size: 11 } }
        }
      }
    }
  });
}

/**
 * Renders a scatter plot showing Price vs Value Score for all entries in state.awards
 */
function renderMarketEfficiencyChart() {
  const ctx = document.getElementById('marketChart').getContext('2d');
  if (!ctx) return;

  // Option A (The Galaxy): Every player is a star. Supersignings are highlights.
  const validData = state.values
    .filter(r => num(r.price_cr) > 0 && num(r.value_score) > 0)
    .map(r => {
      const price = num(r.price_cr);
      const score = num(r.value_score);
      const roi = score / price;
      const isBigBuy = r.is_big_buy === true || r.is_big_buy === "True";

      return {
        x: price,
        y: score,
        player: r.player,
        season: r.season,
        roi: roi,
        isBig: isBigBuy,
        // Small, ghost dots for regular players; large glow for big buys
        radius: isBigBuy ? 8 : 2,
        opacity: isBigBuy ? 0.9 : 0.15,
        color: isBigBuy ? (roi > 15 ? '#22c55e' : (roi < 5 ? '#ef4444' : '#a78bfa')) : 'rgba(255,255,255,0.4)'
      };
    })
    .sort((a, b) => a.isBig - b.isBig); // Draw big buys on top

  new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Players',
        data: validData,
        backgroundColor: validData.map(d => d.color),
        pointRadius: validData.map(d => d.radius),
        borderColor: 'transparent',
        pointHoverRadius: 10,
        pointHoverBackgroundColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10, 10, 15, 0.95)',
          padding: 12,
          callbacks: {
            label: (ctx) => {
              const p = ctx.raw;
              return [`${p.player} (${p.season})`, `ROI Index: ${p.roi.toFixed(1)}x`, `Price: ₹${p.x} Cr` ];
            }
          }
        }
      },
      scales: {
        x: { title: { display: true, text: 'Price (Cr)', color: 'rgba(255,255,255,0.3)', font: { size: 9 } }, grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.4)' } },
        y: { title: { display: true, text: 'Value Score', color: 'rgba(255,255,255,0.3)', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.4)' } }
      }
    }
  });
}

/**
 * Renders a bar chart showing average Strategy IQ (Score per Rupee) per Team
 */
function renderTeamIQChart() {
  const ctx = document.getElementById('teamIQChart').getContext('2d');
  if (!ctx) return;

  // 1. Build a lookup map of Player+Season -> Team from batting stats
  const teamLookup = {};
  state.batting.forEach(r => {
    if (r.player && r.season && r.team && r.team !== 'Unknown') {
      teamLookup[`${r.player}|${r.season}`] = r.team;
    }
  });
  // Complement with bowling stats for bowling-only specialists
  state.bowling.forEach(r => {
    const key = `${r.player}|${r.season}`;
    if (!teamLookup[key] && r.team && r.team !== 'Unknown') {
      teamLookup[key] = r.team;
    }
  });

  // 2. Group by team and calculate average ROI
  const teamMap = {};
  state.values.forEach(r => {
    const price = num(r.price_cr);
    const score = num(r.value_score);
    if (price > 0 && score > 0) {
      const team = teamLookup[`${r.player}|${r.season}`];
      if (team) {
        if (!teamMap[team]) teamMap[team] = { totalRoi: 0, count: 0 };
        teamMap[team].totalRoi += (score / price);
        teamMap[team].count++;
      }
    }
  });

  const sortedTeams = Object.keys(teamMap)
    .map(name => ({
      name,
      avgRoi: teamMap[name].totalRoi / teamMap[name].count
    }))
    .sort((a, b) => b.avgRoi - a.avgRoi);

  if (sortedTeams.length === 0) {
    console.warn("No team ROI data found.");
    return;
  }

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sortedTeams.map(t => t.name),
      datasets: [{
        label: 'Strategy IQ',
        data: sortedTeams.map(t => t.avgRoi),
        backgroundColor: sortedTeams.map((t, i) => i < 3 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(167, 139, 250, 0.4)'),
        borderRadius: { topLeft: 0, topRight: 10, bottomLeft: 0, bottomRight: 10 },
        borderWidth: 0,
        barPercentage: 0.7
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10, 10, 15, 0.95)',
          padding: 10,
          callbacks: { 
            title: (items) => items[0].label,
            label: (ctx) => `Efficiency Index: ${ctx.raw.toFixed(1)}x` 
          }
        }
      },
      scales: {
        x: { 
          title: { display: true, text: 'Value per Cr spent', color: 'rgba(255,255,255,0.2)', font: { size: 9 } },
          grid: { color: 'rgba(255,255,255,0.05)' }, 
          ticks: { color: 'rgba(255,255,255,0.4)' } 
        },
        y: { 
          grid: { display: false }, 
          ticks: { color: 'rgba(255,255,255,0.7)', font: { family: 'Archivo', size: 10, weight: 'bold' } } 
        }
      }
    }
  });
}

/**
 * Generates HTML for a player card
 */
function renderPlayerCard(playerData, team = 'Unknown') {
  const name = playerData.player || playerData.highest_buy_player || 'Unknown Player';
  const img = getPlayerImage(name);
  const accentTeam = playerData.team || playerData.highest_buy_team || team;
  
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

  // Border accent uses canonical CSV franchise (stable CSS keys), not era display name
  const tClass =
    accentTeam == null || accentTeam === ""
      ? "Unknown"
      : String(accentTeam).split(" ")[0];

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
  const rawTeam = data.highest_buy_team || data.team || "Unknown Team";
  const season = data.awardSeason || data.season || "";
  const teamLabel = displayTeamName(rawTeam, season);
  const verdict = getValueVerdict(num(data.value_score));
  const vClass = verdict.toLowerCase().replace(' ', '-');
  const img = getPlayerImage(name);
  
  const statsHtml = `
    <div class="stat-item"><span class="stat-icon">🏃</span><span class="stat-value">${num(data.total_runs)}</span><span class="stat-label">Runs</span></div>
    <div class="stat-item"><span class="stat-icon">⚡</span><span class="stat-value">${formatStats(data.strike_rate || data.sr)}</span><span class="stat-label">SR</span></div>
    <div class="stat-item"><span class="stat-icon">🎯</span><span class="stat-value">${num(data.wickets)}</span><span class="stat-label">Wkts</span></div>
    <div class="stat-item"><span class="stat-icon">💎</span><span class="stat-value">${formatStats(data.value_score)}</span><span class="stat-label">Value</span></div>
  `;

  const tClass = String(rawTeam).split(' ')[0];

  return `
    <div class="player-card ${tClass}">
      <div class="player-card-header">
        ${img}
        <div class="player-info">
          <div class="verdict-badge ${vClass}">${verdict}</div>
          <h4>${name} (${season})</h4>
          <div class="price-tag">${formatCurrency(data.price_cr || data.highest_buy_price_cr)}</div>
          <p>${teamLabel}</p>
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
      if (
        (c.key === "team" || c.key === "highest_buy_team") &&
        val != null &&
        val !== ""
      ) {
        const sy =
          p.awardSeason !== undefined && p.awardSeason !== ""
            ? p.awardSeason
            : p.season;
        if (sy !== undefined && sy !== "") {
          val = displayTeamName(val, sy);
        }
      }
      if (c.formatter) val = c.formatter(val, p);
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

function hidePlayerSuggestions() {
  playerSuggestActiveIndex = -1;
  playerSuggestionsList.innerHTML = "";
  playerSuggestionsList.hidden = true;
  playerInput.setAttribute("aria-expanded", "false");
}

function filterPlayersByQuery(q) {
  const t = q.trim().toLowerCase();
  if (!playerNamesList.length) return [];
  if (!t) {
    return [];
  }
  return playerNamesList
    .filter((p) => String(p).toLowerCase().includes(t))
    .slice(0, MAX_PLAYER_SUGGESTIONS);
}

function buildSuggestionLabel(name, query) {
  const n = String(name);
  const q = query.trim();
  if (!q) return document.createTextNode(n);
  const lower = n.toLowerCase();
  const t = q.toLowerCase();
  const idx = lower.indexOf(t);
  if (idx === -1) return document.createTextNode(n);
  const frag = document.createDocumentFragment();
  frag.append(document.createTextNode(n.slice(0, idx)));
  const mark = document.createElement("mark");
  mark.textContent = n.slice(idx, idx + t.length);
  frag.append(mark, document.createTextNode(n.slice(idx + t.length)));
  return frag;
}

function renderPlayerSuggestions(matches, query) {
  playerSuggestionsList.innerHTML = "";
  if (!matches.length) {
    const li = document.createElement("li");
    li.className = "player-suggestions-empty";
    li.textContent = query.trim()
      ? "No matching players for this season."
      : "No players loaded.";
    playerSuggestionsList.appendChild(li);
    playerSuggestionsList.hidden = false;
    playerInput.setAttribute("aria-expanded", "true");
    return;
  }
  const maxIdx = matches.length - 1;
  if (playerSuggestActiveIndex > maxIdx) playerSuggestActiveIndex = maxIdx;
  if (playerSuggestActiveIndex < 0) playerSuggestActiveIndex = -1;

  matches.forEach((name, i) => {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", i === playerSuggestActiveIndex ? "true" : "false");
    li.append(buildSuggestionLabel(name, query));
    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      applyPlayerChoice(name);
    });
    playerSuggestionsList.appendChild(li);
  });
  playerSuggestionsList.hidden = false;
  playerInput.setAttribute("aria-expanded", "true");
}

function applyPlayerChoice(name) {
  playerInput.value = name;
  hidePlayerSuggestions();
}

function showSuggestionsForCurrentInput() {
  if (!playerInput || playerInput.disabled) return;
  if (!playerInput.value.trim()) {
    hidePlayerSuggestions();
    return;
  }
  const matches = filterPlayersByQuery(playerInput.value);
  renderPlayerSuggestions(matches, playerInput.value);
}

/**
 * Resolve typed text to a canonical name in `playerNamesList` for queries.
 */
function resolvePlayerNameForQuery() {
  const raw = playerInput.value.trim();
  if (!raw || !playerNamesList.length) return "";
  if (playerNamesList.includes(raw)) return raw;
  const ci = playerNamesList.find(
    (p) => String(p).toLowerCase() === raw.toLowerCase()
  );
  if (ci) return ci;
  const t = raw.toLowerCase();
  const includes = playerNamesList.filter((p) =>
    String(p).toLowerCase().includes(t)
  );
  if (includes.length === 1) return includes[0];
  return "";
}

/**
 * Update player autocomplete list based on selected season and category
 */
function updatePlayers() {
  try {
    hidePlayerSuggestions();
    const selectedSeason = Number(seasonSelect.value);
    const category = categorySelect.value;
    const dataSeason = awardSeasonToDataSeason(selectedSeason);

    playerNamesList = [];
    playerInput.disabled = false;
    playerInput.placeholder = "Type player name…";
    playerInput.value = "";

    if (dataSeason === null) {
      playerInput.disabled = true;
      playerInput.placeholder = "No performance data for this season";
      return;
    }

    if (category === "Player Records - Batting") {
      playerNamesList = [
        ...new Set(
          state.batting
            .filter((r) => Number(r.season) === dataSeason)
            .map((r) => r.player)
        ),
      ];
    } else if (category === "Player Records - Bowling") {
      playerNamesList = [
        ...new Set(
          state.bowling
            .filter((r) => Number(r.season) === dataSeason)
            .map((r) => r.player)
        ),
      ];
    }

    playerNamesList.sort((a, b) => String(a).localeCompare(String(b)));

    if (!playerNamesList.length) {
      playerInput.disabled = true;
      playerInput.placeholder = "No players found for this season";
    }
  } catch (err) {
    console.error("Error updating players:", err);
    playerNamesList = [];
    playerInput.value = "";
    playerInput.placeholder = "Error loading players";
    playerInput.disabled = true;
    hidePlayerSuggestions();
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
  
  // Single-player batting/bowling queries need an explicit player pick
  const needsPlayer =
    category.startsWith("Player Records") &&
    (String(qType).includes("of a player in a season") ||
      String(qType).includes("by a player in a season"));
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
        const teamLine = displayTeamName(awardsRow.highest_buy_team, season);
        displayResult(`${awardsRow.highest_buy_player} (${season}) — ${teamLine}\n- Price: ₹${num(awardsRow.highest_buy_price_cr).toFixed(2)} Cr${hasPerf ? `\n- Runs: ${runs} | SR: ${sr ? formatStats(sr) : "N/A"}\n- Wickets: ${wkts} | Economy: ${eco ? formatStats(eco) : "N/A"}` : ""}\n\n⚠️ Detailed performance data for this player's season is not available in the dataset.\nThis may be because the player did not participate or data was not recorded.`);
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

  if (q === "Top 10 value-for-money highest-buys") {
    const table = renderPlayersTable(sortedDesc.slice(0, TABLE_TOP_N), auctionTableColumns);
    displayHtmlResult(`<h4>📈 Top ${TABLE_TOP_N} Best Value Buys</h4><br>${table}`);
    return;
  }

  if (q === "Bottom 10 overpriced highest-buys") {
    const table = renderPlayersTable(sortedAsc.slice(0, TABLE_TOP_N), auctionTableColumns);
    displayHtmlResult(`<h4>📉 Top ${TABLE_TOP_N} Most Overpriced Buys</h4><br>${table}`);
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
  const player = resolvePlayerNameForQuery();

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
    if (!player) {
      displayResult(
        "Type a player name and pick a suggestion, or type the full name exactly as in the dataset. If several players match, choose one from the list."
      );
      return;
    }
    const r = rows.find((x) => String(x.player) === player);
    if (!r) {
      displayResult(`No batting record found for ${player} in ${selectedSeason}.`);
      return;
    }
    const table = renderPlayersTable([r], [
      { label: "Player", key: "player" },
      { label: "Team", key: "team" },
      { label: "Runs", key: "total_runs" },
      { label: "Average", key: "batting_average", formatter: (v) => formatStats(v, 2) },
      { label: "SR", key: "strike_rate", formatter: (v) => formatStats(v, 1) },
      { label: "Balls", key: "balls_faced" },
    ]);
    renderPlayerPulseChart(player, 'runs');
    displayHtmlResult(
      `<h4>🏏 Batting — ${selectedSeason}</h4><p style="opacity:0.85;font-size:14px;margin:0 0 12px;">Runs by selected player</p>${table}`
    );
    return;
  }

  if (q === "Top 10 batsmen in a season") {
    const top = [...rows].sort((a, b) => num(b.total_runs) - num(a.total_runs)).slice(0, TABLE_TOP_N);
    const table = renderPlayersTable(top, [
      {label: 'Player', key: 'player'},
      {label: 'Team', key: 'team'},
      {label: 'Runs', key: 'total_runs'},
      {label: 'Average', key: 'batting_average', formatter: v => formatStats(v, 2)},
      {label: 'SR', key: 'strike_rate', formatter: v => formatStats(v, 1)}
    ]);
    displayHtmlResult(`<h4>🏏 Top ${TABLE_TOP_N} Batsmen (${selectedSeason})</h4><br>${table}`);
    return;
  }

  if (q === "Highest run scorer in a season") {
    const top = [...rows].sort((a, b) => num(b.total_runs) - num(a.total_runs)).slice(0, TABLE_TOP_N);
    if (!top.length) {
      displayResult("No data.");
      return;
    }
    const table = renderPlayersTable(top, [
      { label: "Player", key: "player" },
      { label: "Team", key: "team" },
      { label: "Runs", key: "total_runs" },
      { label: "Average", key: "batting_average", formatter: (v) => formatStats(v, 2) },
      { label: "SR", key: "strike_rate", formatter: (v) => formatStats(v, 1) },
    ]);
    displayHtmlResult(
      `<h4>👑 Top ${TABLE_TOP_N} run scorers (${selectedSeason})</h4><br>${table}`
    );
    return;
  }

  if (q === "Best strike rate players (min 100 balls)") {
    const filtered = rows
      .filter((r) => num(r.balls_faced) >= 100)
      .sort((a, b) => num(b.strike_rate) - num(a.strike_rate))
      .slice(0, TABLE_TOP_N);
    
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
    displayHtmlResult(`<h4>🚀 Top ${TABLE_TOP_N} Strike Rate (100+ Balls) - ${selectedSeason}</h4><br>${table}`);
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
  const player = resolvePlayerNameForQuery();

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
    if (!player) {
      displayResult(
        "Type a player name and pick a suggestion, or type the full name exactly as in the dataset. If several players match, choose one from the list."
      );
      return;
    }
    const r = rows.find((x) => String(x.player) === player);
    if (!r) {
      displayResult(`No bowling record found for ${player} in ${selectedSeason}.`);
      return;
    }
    renderPlayerPulseChart(player, 'wickets');
    displayHtmlResult(
      renderPlayerCard(r, displayTeamName(r.team, r.season))
    );
    return;
  }

  if (q === "Most wickets in a season") {
    const top = [...rows].sort((a, b) => num(b.wickets) - num(a.wickets)).slice(0, TABLE_TOP_N);
    const table = renderPlayersTable(top, [
      {label: 'Player', key: 'player'},
      {label: 'Team', key: 'team'},
      {label: 'Wickets', key: 'wickets'},
      {label: 'Econ', key: 'economy', formatter: v => formatStats(v, 2)},
      {label: 'Avg', key: 'bowling_average', formatter: v => formatStats(v, 2)},
      {label: 'SR', key: 'bowling_strike_rate', formatter: v => formatStats(v, 1)},
      {label: 'Dots', key: 'dot_balls'}
    ]);
    displayHtmlResult(`<h4>🎯 Top ${TABLE_TOP_N} Wicket Takers (${selectedSeason})</h4><br>${table}`);
    return;
  }

  if (q === "Best bowler in a season (wickets)") {
    const top = [...rows].sort((a, b) => num(b.wickets) - num(a.wickets)).slice(0, TABLE_TOP_N);
    if (!top.length) {
      displayResult("No data.");
      return;
    }
    const table = renderPlayersTable(top, [
      { label: "Player", key: "player" },
      { label: "Team", key: "team" },
      { label: "Wickets", key: "wickets" },
      { label: "Econ", key: "economy", formatter: (v) => formatStats(v, 2) },
      { label: "Avg", key: "bowling_average", formatter: (v) => formatStats(v, 2) },
      { label: "SR", key: "bowling_strike_rate", formatter: (v) => formatStats(v, 1) },
      { label: "Dots", key: "dot_balls" },
    ]);
    displayHtmlResult(
      `<h4>🏆 Top ${TABLE_TOP_N} bowlers by wickets (${selectedSeason})</h4><br>${table}`
    );
    return;
  }

  if (q === "Best economy bowlers") {
    const filtered = rows
      .filter((r) => num(r.balls_bowled) >= 60)
      .sort((a, b) => num(a.economy) - num(b.economy))
      .slice(0, TABLE_TOP_N);
    
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
    displayHtmlResult(`<h4>🧤 Top ${TABLE_TOP_N} Economy (Min 10 Overs) - ${selectedSeason}</h4><br>${table}`);
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
    const topBatsmen = [...rows].sort((a, b) => num(b.total_runs) - num(a.total_runs)).slice(0, TABLE_TOP_N);
    const tblHtml = renderPlayersTable(topBatsmen, [
      { label: 'Player', key: 'player' },
      { label: 'Runs', key: 'total_runs' },
      { label: 'SR', key: 'strike_rate', formatter: v => formatStats(v, 1) },
      { label: 'Avg', key: 'batting_average', formatter: v => formatStats(v, 1) },
      { label: 'Sixes', key: 'sixes' }
    ]);
    const headerHtml = `<h4>🏏 Top ${TABLE_TOP_N} batsmen for ${team} in ${selectedSeason}</h4><br>`;
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
    const topBowlers = [...rows].sort((a, b) => num(b.wickets) - num(a.wickets)).slice(0, TABLE_TOP_N);
    const tblHtml = renderPlayersTable(topBowlers, [
      { label: 'Player', key: 'player' },
      { label: 'Wickets', key: 'wickets' },
      { label: 'Econ', key: 'economy', formatter: v => formatStats(v, 2) },
      { label: 'SR', key: 'bowling_strike_rate', formatter: v => formatStats(v, 1) },
      { label: 'Dots', key: 'dot_balls' }
    ]);
    const headerHtml = `<h4>🎯 Top ${TABLE_TOP_N} bowlers for ${team} in ${selectedSeason}</h4><br>`;
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
      htmlResult += `<h5 style="margin-top: 24px; margin-bottom: 12px; color: var(--muted); font-size: 13px; text-transform: uppercase;">Other top finishers (up to ${TABLE_TOP_N - 1} players)</h5>`;
      htmlResult += renderPlayersTable(mvpList.slice(1, TABLE_TOP_N), [
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
    destroyPulseChart();
    analyticsSlot.classList.add("hidden");

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

    // Render the analytics dashboard
    renderMarketEfficiencyChart();
    renderTeamIQChart();
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

// Player name autocomplete (replaces legacy <select>)
playerInput.addEventListener("input", () => {
  playerSuggestActiveIndex = -1;
  showSuggestionsForCurrentInput();
});

playerInput.addEventListener("focus", () => {
  playerSuggestActiveIndex = -1;
  showSuggestionsForCurrentInput();
});

playerInput.addEventListener("blur", () => {
  window.setTimeout(() => hidePlayerSuggestions(), 180);
});

playerInput.addEventListener("keydown", (e) => {
  if (playerInput.disabled) return;
  const matches = filterPlayersByQuery(playerInput.value);

  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (!matches.length) return;
    if (playerSuggestionsList.hidden) playerSuggestActiveIndex = -1;
    playerSuggestActiveIndex = Math.min(
      playerSuggestActiveIndex + 1,
      matches.length - 1
    );
    renderPlayerSuggestions(matches, playerInput.value);
    return;
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();
    if (!matches.length) return;
    if (playerSuggestActiveIndex <= 0) {
      playerSuggestActiveIndex = matches.length - 1;
    } else {
      playerSuggestActiveIndex -= 1;
    }
    renderPlayerSuggestions(matches, playerInput.value);
    return;
  }

  if (e.key === "Enter") {
    if (!matches.length) return;
    const pick =
      playerSuggestActiveIndex >= 0
        ? matches[playerSuggestActiveIndex]
        : matches.length === 1
          ? matches[0]
          : null;
    if (pick) {
      e.preventDefault();
      applyPlayerChoice(pick);
    }
    return;
  }

  if (e.key === "Escape") {
    hidePlayerSuggestions();
  }
});

// Scroll effects listener (passive for performance)
window.addEventListener("scroll", applyScrollEffects, { passive: true });

// ============================================
// APPLICATION START
// ============================================
document.addEventListener("DOMContentLoaded", init);
