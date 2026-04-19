function normalizeSeasonData(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => ({
      season: Number(entry.season),
      squad: Array.isArray(entry.squad) ? entry.squad : []
    }))
    .filter((entry) => Number.isFinite(entry.season))
    .sort((a, b) => a.season - b.season);
}

function toRoleKey(player) {
  const roleText = `${player.role || ""} ${player.category || ""}`.toLowerCase();
  if (roleText.includes("bowler")) return "bowler";
  if (roleText.includes("allround") || roleText.includes("all-round")) return "allrounder";
  if (roleText.includes("batter") || roleText.includes("bat")) return "batter";
  if ((player.category || "").toLowerCase() === "bowler") return "bowler";
  if ((player.category || "").toLowerCase().includes("all")) return "allrounder";
  return "batter";
}

function getInitials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function getFlag(playerName, isOverseas) {
  const map = {
    "Adam Milne": "NZ", "Akila Dananjaya": "SL", "Albie Morkel": "SA", "Andrew Flintoff": "ENG",
    "Andrew Tye": "AUS", "Ben Hilfenhaus": "AUS", "Ben Laughlin": "AUS", "Ben Stokes": "ENG",
    "Brendon McCullum": "NZ", "Chamara Kapugedera": "SL", "Chris Jordan": "ENG", "Chris Morris": "SA",
    "Daryl Mitchell": "NZ", "David Hussey": "AUS", "David Willey": "ENG", "Devon Conway": "NZ",
    "Dirk Nannes": "AUS", "Dominic Drakes": "WI", "Doug Bollinger": "AUS", "Dwaine Pretorius": "SA",
    "Dwayne Bravo": "WI", "Dwayne Smith": "WI", "Faf du Plessis": "SA", "George Bailey": "AUS",
    "Imran Tahir": "SA", "Jacob Oram": "NZ", "Jamie Overton": "ENG", "Jason Behrendorff": "AUS",
    "Jason Holder": "WI", "John Hastings": "AUS", "Josh Hazlewood": "AUS", "Justin Kemp": "SA",
    "Kyle Abbott": "SA", "Kyle Jamieson": "NZ", "Lungi Ngidi": "SA", "Maheesh Theekshana": "SL",
    "Makhaya Ntini": "SA", "Mark Wood": "ENG", "Matheesha Pathirana": "SL", "Matt Henry": "NZ",
    "Matthew Hayden": "AUS", "Michael Hussey": "AUS", "Mitchell Santner": "NZ", "Moeen Ali": "ENG",
    "Mustafizur Rahman": "BAN", "Muthiah Muralidaran": "SL", "Muttiah Muralitharan": "SL",
    "Nathan Ellis": "AUS", "Noor Ahmad": "AFG", "Nuwan Kulasekara": "SL", "Rachin Ravindra": "NZ",
    "Richard Gleeson": "ENG", "Sam Billings": "ENG", "Sam Curran": "ENG", "Samuel Badree": "WI",
    "Scott Kuggeleijn": "NZ", "Scott Styris": "NZ", "Shane Watson": "AUS", "Sisanda Magala": "SA",
    "Stephen Fleming": "NZ", "Suraj Randiv": "SL", "Thilan Thushara": "SL", "Thisara Perera": "SL",
    "Tim Southee": "NZ", "David Miller": "SA", "AB de Villiers": "SA", "Quinton de Kock": "SA",
    "David Warner": "AUS", "Glenn Maxwell": "AUS", "Marcus Stoinis": "AUS", "Mitchell Marsh": "AUS",
    "Pat Cummins": "AUS", "Kagiso Rabada": "SA", "Anrich Nortje": "SA", "Harry Brook": "ENG",
    "Jason Roy": "ENG", "Shimron Hetmyer": "WI", "Nicholas Pooran": "WI", "Andre Russell": "WI",
    "Sunil Narine": "WI", "Tillakaratne Dilshan": "SL", "Farveez Maharoof": "SL",
    "Andrew McDonald": "AUS", "Carlos Brathwaite": "WI", "Colin Munro": "NZ",
    "Corey Anderson": "NZ", "Daniel Vettori": "NZ", "Dushmantha Chameera": "SL",
    "Glenn McGrath": "AUS", "Jake Fraser-McGurk": "AUS", "Jhye Richardson": "AUS",
    "Kevin Pietersen": "ENG", "Liam Plunkett": "ENG", "Mahela Jayawardene": "SL",
    "Morne Morkel": "SA", "Nathan Coulter-Nile": "AUS", "Owais Shah": "ENG",
    "Paul Collingwood": "ENG", "Ross Taylor": "NZ", "Rovman Powell": "WI",
    "Sandeep Lamichhane": "NEP", "Shai Hope": "WI", "Tim Seifert": "NZ",
    "Tristan Stubbs": "SA", "Adam Gilchrist": "AUS", "Andrew Symonds": "AUS",
    "Cameron White": "AUS", "Chamara Silva": "SL", "Chaminda Vaas": "SL",
    "Chris Lynn": "AUS", "Dale Steyn": "SA", "Dan Christian": "AUS",
    "Daniel Harris": "AUS", "Darren Bravo": "WI", "Fidel Edwards": "WI",
    "Herschelle Gibbs": "SA", "Jean-Paul Duminy": "SA", "Kemar Roach": "WI",
    "Kumar Sangakkara": "SL", "Michael Lumb": "ENG", "Nuwan Zoysa": "SL",
    "Rusty Theron": "SA", "Ryan Harris": "AUS", "Shahid Afridi": "PAK",
    "Tanmay Mishra": "KEN"
  };
  if (map[playerName]) return map[playerName];
  return isOverseas ? "INT" : "IND";
}

const ROLE_META = {
  batter: {
    title: "Batters",
    icon: "fa-solid fa-baseball-bat-ball",
    iconColorClass: "blue",
    dotClass: "blue",
    avatarClass: "batter"
  },
  allrounder: {
    title: "All-Rounders",
    icon: "fa-solid fa-bolt-lightning",
    iconColorClass: "green",
    dotClass: "green",
    avatarClass: "allrounder"
  },
  bowler: {
    title: "Bowlers",
    icon: "fa-solid fa-bullseye",
    iconColorClass: "red",
    dotClass: "red",
    avatarClass: "bowler"
  }
};

let appState = {
  season: 2020,
  filter: "all",
  view: "grid",
  search: "",
  allSeasons: [],
  currentPlayers: [],
  seasons: []
};

function generateScoutReport(player) {
  const name = player.name || "This player";
  const role = toRoleKey(player);
  const isOverseas = player.is_overseas;
  const isCaptain = player.is_captain;

  const templates = {
    batter: [
      `${name} is a vital cog in the top order, known for their tactical versatility and ability to anchor the innings.`,
      `A primary ball-striker who specializes in powerplay acceleration and maintaining a high strike rate.`,
      `A technically sound batter capable of handling both pace and spin with high efficiency.`
    ],
    allrounder: [
      `A versatile tactical asset providing critical balance with both bat and ball in high-pressure scenarios.`,
      `A multi-dimensional player who offers strategic depth, often used as a finisher or a partnership breaker.`,
      `A high-impact utility player known for their athletic fielding and match-winning contributions in both departments.`
    ],
    bowler: [
      `A strategic strike-bowler capable of delivering high-velocity variations and maintaining strict economy rates.`,
      `Specializes in death-overs execution with a wide array of deceptive variations and tactical precision.`,
      `An opening-spell specialist known for their ability to extract movement and provide early breakthroughs.`
    ]
  };

  const pool = templates[role] || templates.batter;
  let report = pool[Math.floor(Math.random() * pool.length)];

  if (isCaptain) report = `The architectural lead of the squad. ` + report;
  if (isOverseas) report += ` A marquee international signing with extensive global league experience.`;

  return report;
}

function initModal() {
  const modal = document.getElementById("playerModal");
  const closeBtn = document.getElementById("modalClose");
  if (!modal || !closeBtn) return;

  const close = () => modal.classList.remove("open");
  closeBtn.onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  window.showPlayerModal = (player) => {
    const roleKey = toRoleKey(player);
    const meta = ROLE_META[roleKey];

    document.getElementById("modalName").textContent = player.name;
    document.getElementById("modalSubtitle").innerHTML = `
      <span class="role-dot ${meta.dotClass}"></span>
      ${player.role || player.category || "Player"}
    `;

    const avatar = document.getElementById("modalAvatar");
    avatar.className = `modal-avatar ${meta.avatarClass}`;
    avatar.textContent = getInitials(player.name);

    document.getElementById("modalBatting").textContent = player.batting_style || "Right-Hand Bat";
    document.getElementById("modalBowling").textContent = player.bowling_style || "N/A";
    document.getElementById("modalAge").textContent = player.age || "Professional";
    document.getElementById("modalOrigin").textContent = player.country || (player.is_overseas ? "International" : "India");

    document.getElementById("modalScoutText").textContent = generateScoutReport(player);

    document.getElementById("modalCaptainTag").style.display = player.is_captain ? "flex" : "none";
    document.getElementById("modalOverseasTag").style.display = player.is_overseas ? "flex" : "none";

    modal.classList.add("open");
  };
}

function getVisiblePlayers(players) {
  const q = appState.search.trim().toLowerCase();
  return players.filter((player) => {
    const role = toRoleKey(player);
    const searchOk = q === "" || String(player.name || "").toLowerCase().includes(q);
    if (!searchOk) return false;
    if (appState.filter === "all") return true;
    if (appState.filter === "overseas") return Boolean(player.is_overseas);
    return role === appState.filter;
  });
}

function computeStats(players) {
  const counts = {
    total: players.length,
    batter: 0,
    allrounder: 0,
    bowler: 0,
    overseas: 0
  };
  players.forEach((player) => {
    const role = toRoleKey(player);
    counts[role] += 1;
    if (player.is_overseas) counts.overseas += 1;
  });
  return counts;
}


function animateCards() {
  const cards = [...document.querySelectorAll(".player-card")];
  const io = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
  );
  cards.forEach((card, index) => {
    card.style.transitionDelay = `${Math.min(index * 40, 360)}ms`;
    io.observe(card);
  });
}

function parseAge(age) {
  if (typeof age === "number") return age;
  if (typeof age === "string") {
    const match = age.match(/^(\d+)/);
    if (match) return parseInt(match[1]);
  }
  return 0;
}

function updateAnalytics(players) {
  const stats = computeStats(players);
  let totalAge = 0;
  let ageCount = 0;
  let captains = 0;

  players.forEach((p) => {
    const age = parseAge(p.age);
    if (age > 0) {
      totalAge += age;
      ageCount++;
    }
    if (p.is_captain) captains++;
  });

  const avgAge = ageCount > 0 ? (totalAge / ageCount).toFixed(1) : "N/A";

  const totalEl = document.getElementById("statTotal");
  const overseasEl = document.getElementById("statOverseas");
  const ageEl = document.getElementById("statAge");
  const captainsEl = document.getElementById("statCaptains");
  const balanceEl = document.getElementById("statBalance");

  if (totalEl) totalEl.textContent = stats.total;
  if (overseasEl) overseasEl.textContent = stats.overseas;
  if (ageEl) ageEl.textContent = avgAge;
  if (captainsEl) captainsEl.textContent = captains;
  if (balanceEl) balanceEl.textContent = `${stats.batter}/${stats.bowler}/${stats.allrounder}`;
}

function renderSections(players) {
  const wrap = document.getElementById("sectionsWrap");
  if (!wrap) return;

  // Cinematic: Trigger fade-out and pulse
  wrap.classList.add("switching");

  // Brief delay to allow fade-out and pulse to be seen
  setTimeout(() => {
    const visible = getVisiblePlayers(players);
    const grouped = {
      batter: [],
      allrounder: [],
      bowler: []
    };
    visible.forEach((player) => grouped[toRoleKey(player)].push(player));

    wrap.classList.toggle("list-view", appState.view === "list");
    wrap.innerHTML = "";

    const rolesInOrder = ["batter", "allrounder", "bowler"];
    let visibleSectionCount = 0;
    rolesInOrder.forEach((roleKey) => {
      const rolePlayers = grouped[roleKey];
      if (rolePlayers.length === 0) return;
      visibleSectionCount += 1;

      const meta = ROLE_META[roleKey];
      const sectionNode = document.createElement("section");
      sectionNode.className = "player-section";
      sectionNode.dataset.section = roleKey;
      sectionNode.innerHTML = `
        <div class="section-header">
          <div class="section-icon ${meta.iconColorClass}"><i class="${meta.icon}"></i></div>
          <span class="section-title">${meta.title}</span>
          <span class="section-count">${rolePlayers.length} Players</span>
        </div>
        <div class="section-divider"></div>
        <div class="player-grid"></div>
      `;
      const gridEl = sectionNode.querySelector(".player-grid");
      if (!gridEl) return;

      rolePlayers.forEach((player) => {
        const cardNode = document.createElement("div");
        cardNode.className = `player-card${player.is_captain ? " captain-card" : ""}`;
        cardNode.dataset.role = roleKey;
        cardNode.dataset.overseas = String(Boolean(player.is_overseas));
        cardNode.dataset.name = player.name || "";
        
        // Add randomized impact for tactical feel
        const impact = Math.floor(Math.random() * (95 - 65 + 1)) + 65;
        cardNode.style.setProperty('--impact', `${impact}%`);

        cardNode.innerHTML = `
          <div class="player-avatar ${meta.avatarClass}">
            ${getInitials(player.name)}
            ${player.is_captain ? '<div class="captain-badge">C</div>' : ""}
            ${player.is_overseas ? '<div class="overseas-badge"><i class="fa-solid fa-plane"></i></div>' : ""}
          </div>
          <div class="player-details">
            <div class="player-name">${player.name || ""}</div>
            <div class="player-role">${player.role || player.category || "Player"}</div>
            <div class="card-impact-bar">
                <div class="card-impact-fill"></div>
            </div>
          </div>
          <div class="player-meta">${player.country || getFlag(player.name, player.is_overseas)}</div>
        `;
        cardNode.onclick = () => {
          if (window.showPlayerModal) window.showPlayerModal(player);
        };
        gridEl.appendChild(cardNode);
      });

      wrap.appendChild(sectionNode);
    });

    if (visibleSectionCount === 0) {
      wrap.innerHTML = '<p style="color:#fca5a5;font-size:13px">No players match your filters.</p>';
    }

    // Cinematic: End switching state and fade-in new content
    wrap.classList.remove("switching");
    updateAnalytics(players);
    animateCards();
  }, 450); // Slightly more than the 0.4s CSS transition for extra smoothness
}

function renderDropdown(seasons) {
  const dropdown = document.getElementById("seasonDropdown");
  const button = document.getElementById("seasonBtn");
  const label = document.getElementById("seasonText");
  if (!dropdown || !button || !label) return;

  label.textContent = `${appState.season} Season`;
  dropdown.innerHTML = seasons
    .map((season) => {
      const active = season === appState.season;
      return `<div class="season-option ${active ? "selected" : ""}" data-season="${season}">
          <span>${season} Season</span>
          ${active ? '<span class="check"><i class="fa-solid fa-check"></i></span>' : ""}
        </div>`;
    })
    .join("");

  const close = () => {
    dropdown.classList.remove("open");
    button.classList.remove("open");
  };

  button.onclick = (event) => {
    event.stopPropagation();
    dropdown.classList.toggle("open");
    button.classList.toggle("open");
  };

  [...dropdown.querySelectorAll(".season-option")].forEach((item) => {
    item.onclick = () => {
      const season = Number(item.getAttribute("data-season"));
      appState.season = season;
      appState.currentPlayers =
        appState.allSeasons.find((s) => s.season === season)?.squad || [];
      const seasonBadge = document.getElementById("seasonBadgeText");
      if (seasonBadge) seasonBadge.textContent = `${season} Season`;
      renderDropdown(seasons);
      renderSections(appState.currentPlayers);
      close();
    };
  });

  document.addEventListener("click", (event) => {
    if (!dropdown.contains(event.target)) close();
  });
}

function bindControls() {
  const search = document.getElementById("searchInput");
  const filterPills = [...document.querySelectorAll(".filter-pill")];
  const gridBtn = document.getElementById("gridViewBtn");
  const listBtn = document.getElementById("listViewBtn");
  const viewBtns = [...document.querySelectorAll(".view-btn")];

  if (search) {
    search.addEventListener("input", () => {
      appState.search = search.value || "";
      renderSections(appState.currentPlayers);
    });
  }

  filterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      appState.filter = pill.getAttribute("data-filter") || "all";
      filterPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      renderSections(appState.currentPlayers);
    });
  });

  viewBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      appState.view = btn.dataset.view || "grid";
      viewBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const wrap = document.getElementById("sectionsWrap");
      if (wrap) wrap.classList.toggle("list-view", appState.view === "list");
      renderSections(appState.currentPlayers);
    });
  });
}

async function loadSquadPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const teamId = (urlParams.get('team') || 'csk').toLowerCase();
  
  // 1. IMMEDIATE HEADER UPDATE (Prevents "CSK" flicker)
  const titleEl = document.getElementById("squadTitle");
  const logoContainer = document.querySelector(".team-logo-container");
  const bgOverlay = document.querySelector(".squad-bg");
  
  let teamInfo = null;
  try {
    const teamsRes = await fetch("./data/ipl-teams-bundle.json");
    if (teamsRes.ok) {
      const teamsData = await teamsRes.json();
      teamInfo = teamsData.teams.find(t => t.id.toLowerCase() === teamId);
    }
  } catch (e) { console.warn("Team bundle load failed, using fallbacks"); }

  // Update Name
  if (titleEl) titleEl.textContent = teamInfo ? teamInfo.name.toUpperCase() : teamId.toUpperCase();
  
  // Update Logo
  if (logoContainer) {
    if (teamInfo && teamInfo.logoUrl) {
      logoContainer.innerHTML = `
        <img src="${teamInfo.logoUrl}" 
             alt="${teamId}" 
             style="width: 80%; height: 80%; object-fit: contain; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.4));"
        >`;
      logoContainer.style.background = "rgba(255, 255, 255, 0.03)";
      logoContainer.style.border = "1px solid rgba(255, 255, 255, 0.08)";
      logoContainer.style.backdropFilter = "blur(10px)";
    } else {
      logoContainer.innerHTML = `<span class="team-logo-text">${teamId.toUpperCase()}</span>`;
    }
  }

  // Update Background
  if (bgOverlay) {
    const teamBg = teamInfo?.bgUrl || urlParams.get('bg');
    const possibleBgs = [
      teamBg,
      `/ipl-teams/${teamId}/${teamId}-bg.jpg`,
      `./assets/team-backgrounds/${teamId}-bg.jpg`,
      `./assets/team-backgrounds/${teamId}-bg.png`
    ].filter(Boolean);
    
    for (const bgPath of possibleBgs) {
      bgOverlay.style.backgroundImage = `url("${bgPath}")`;
      if (bgPath === teamBg) break;
    }
  }

  // 2. SQUAD DATA LOADING
  try {
    const squadPaths = [
      `./data/squads/${teamId}_squad_all_seasons.json`,
      `/data/squads/${teamId}_squad_all_seasons.json`,
      `data/squads/${teamId}_squad_all_seasons.json`
    ];

    let squadJson = null;
    for (const path of squadPaths) {
      try {
        // Add cache-buster to force-reload corrected data
        const response = await fetch(`${path}?t=${Date.now()}`);
        if (response.ok) {
          squadJson = await response.json();
          break;
        }
      } catch (_e) {}
    }

    if (!squadJson) throw new Error(`Squad data for ${teamId} not found`);

    const seasons = normalizeSeasonData(squadJson);
    if (seasons.length === 0) throw new Error("No seasons found");

    appState.allSeasons = seasons;
    appState.seasons = seasons.map((s) => s.season);
    appState.season = appState.seasons[appState.seasons.length - 1];
    appState.currentPlayers = seasons.find((s) => s.season === appState.season)?.squad || [];

    // Update Honours
    const honoursBadge = document.querySelector(".badge-yellow");
    if (teamInfo && honoursBadge) {
      const titles = teamInfo.honours?.ipl_titles || 0;
      if (titles > 0) {
        honoursBadge.innerHTML = `<i class="fa-solid fa-trophy" style="font-size:9px;"></i> ${titles}x Champions`;
        honoursBadge.style.display = "inline-flex";
      } else {
        honoursBadge.style.display = "none";
      }
    }

    const seasonBadge = document.getElementById("seasonBadgeText");
    if (seasonBadge) seasonBadge.textContent = `${appState.season} Season`;

    renderDropdown(appState.seasons);
    renderSections(appState.currentPlayers);
    bindControls();
    initModal();

  } catch (error) {
    console.error("[Squad List]", error);
    const wrap = document.getElementById("sectionsWrap");
    if (wrap) wrap.innerHTML = `<div style="padding:40px; text-align:center; color:#fca5a5;">
      <i class="fa-solid fa-circle-exclamation" style="font-size:24px; margin-bottom:12px;"></i>
      <p style="font-size:14px;">Squad data for ${teamId.toUpperCase()} is currently unavailable.</p>
    </div>`;
  }
}

document.addEventListener("DOMContentLoaded", loadSquadPage);
