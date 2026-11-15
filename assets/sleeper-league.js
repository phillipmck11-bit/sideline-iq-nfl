(() => {
  "use strict";

  const core = window.SidelineSleeperCore;
  const API = "https://api.sleeper.app/v1";
  const KEY_LEAGUE = "sideline-iq-sleeper-league-id";
  const KEY_CATALOG = "sideline-iq-sleeper-nfl-players-v1";
  const DAY = 24 * 60 * 60 * 1000;
  const state = { loading: false, active: false, leagueId: "", league: null, rosters: [],
    users: [], catalog: null, research: null, matchups: new Map(), week: 10,
    horizon: "week", selectedRoster: null, projections: [], matched: 0, eligibleCount: 0 };
  const $ = selector => document.querySelector(selector);
  const safe = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);
  const num = (value, digits = 1) => Number.isFinite(+value) ? (+value).toFixed(digits) : "—";

  function cached(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
  function remember(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage optional */ } }

  function parseLeagueId(input) {
    const trimmed = String(input || "").trim();
    const match = trimmed.match(/^\d{16,20}$/) || trimmed.match(/(?:league|leagues)\/(\d{16,20})(?:\D|$)/i);
    return match ? String(match[1] || match[0]) : null;
  }

  async function sleeperGet(path) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${API}${path}`, { signal: controller.signal, mode: "cors", credentials: "omit" });
      if (!response.ok) throw new Error(`Sleeper returned HTTP ${response.status}`);
      return await response.json();
    } finally { clearTimeout(timeout); }
  }

  async function loadPlayerCatalog() {
    const existing = cached(KEY_CATALOG);
    if (existing?.updated && Date.now() - existing.updated < DAY && existing.players) return existing.players;
    try {
      // Sleeper asks that this large player ID directory be requested no more
      // than daily. Cache a minimal crosswalk, never the full response body.
      const all = await sleeperGet("/players/nfl");
      const minimized = {};
      for (const [id, info] of Object.entries(all || {})) {
        if (!info || !info.position) continue;
        minimized[id] = { gsis_id: info.gsis_id || null, stats_id: info.stats_id || null,
          full_name: info.full_name || null, first_name: info.first_name || null,
          last_name: info.last_name || null, position: info.position, team: info.team || "" };
      }
      remember(KEY_CATALOG, { updated: Date.now(), players: minimized });
      return minimized;
    } catch (error) {
      if (existing?.players) return existing.players; // stale map is preferable to losing league access
      throw error;
    }
  }

  function setStatus(message, error = false) {
    const element = $("#sleeperStatus");
    element.textContent = message;
    element.classList.toggle("lab-error", error);
  }

  function ownerFor(roster) {
    const user = state.users.find(item => String(item.user_id) === String(roster.owner_id)) || {};
    const team = user.metadata?.team_name?.trim() || user.display_name || user.username || `Team ${roster.roster_id}`;
    return { team, manager: user.display_name || user.username || "Manager unavailable",
      username: user.username || "", mine: String(user.username || "").toLowerCase() === "phillipmck11" };
  }

  function rosterCandidates(roster, lookup) {
    return (roster.players || []).map(id => {
      const sleeper = state.catalog?.[String(id)];
      const model = core.findResearchPlayer(sleeper, lookup);
      return { id: String(id), name: sleeper?.full_name || [sleeper?.first_name, sleeper?.last_name].filter(Boolean).join(" ") || `Sleeper ID ${id}`,
        position: sleeper?.position || null, team: sleeper?.team || "", model };
    });
  }

  function horizonWeeks() {
    return Array.from({ length: (state.horizon === "week" ? 1 : state.horizon === "four" ? 4 : 9) }, (_, i) => state.week + i)
      .filter(week => week <= 18);
  }

  function currentRecords(roster) {
    const settings = roster.settings || {};
    return `${Number(settings.wins || 0)}-${Number(settings.losses || 0)}${settings.ties ? `-${settings.ties}` : ""}`;
  }

  function projectedTeams() {
    const lookup = core.modelLookup(state.research?.players);
    const slots = state.league?.roster_positions || [];
    const weeks = horizonWeeks();
    return state.rosters.map(roster => {
      const candidates = rosterCandidates(roster, lookup);
      const projection = core.projectHorizon(candidates, slots, weeks);
      return { roster, candidates, projection, ...ownerFor(roster),
        covered: candidates.filter(candidate => candidate.model).length,
        eligible: candidates.filter(candidate => ["QB", "RB", "WR", "TE"].includes(candidate.position)).length };
    }).sort((a, b) => b.projection.total - a.projection.total || a.team.localeCompare(b.team));
  }

  function scoringNotice() {
    const expected = { pass_yd: .05, pass_td: 4, pass_int: -2, rush_yd: .1,
      rush_td: 6, rec_yd: .1, rec_td: 6, rec: 1 };
    const actual = state.league?.scoring_settings || {};
    const mismatches = Object.entries(expected).filter(([key, value]) =>
      actual[key] !== undefined && Math.abs(Number(actual[key]) - value) > .00001);
    if (mismatches.length) return ` Scoring notice: Sleeper settings differ from the research model for ${mismatches.map(([key]) => key).join(", ")}.`;
    if (actual.bonus_rec_te !== undefined && Math.abs(Number(actual.bonus_rec_te) - .5) > .00001)
      return " Scoring notice: Sleeper TE premium differs from the research model's +0.5 points per TE reception.";
    return " Scoring uses the user-approved Sideline IQ categories; bonuses, fumbles and other league rules are not modeled.";
  }

  function renderOverview(teams) {
    const slots = core.supportedStarters(state.league.roster_positions).length;
    const all = teams.flatMap(team => team.candidates);
    state.eligibleCount = all.filter(p => ["QB", "RB", "WR", "TE"].includes(p.position)).length;
    state.matched = all.filter(p => p.model).length;
    $("#sleeperOverview").hidden = false;
    $("#sleeperOverview").innerHTML = [
      [teams.length, "FANTASY TEAMS"], [slots, "MODELED STARTER SLOTS"],
      [`${state.matched}/${state.eligibleCount}`, "ROSTER PLAYERS MATCHED"],
      [state.league.season, "SLEEPER SEASON"]
    ].map(([value, label]) => `<article><strong>${safe(value)}</strong><small>${safe(label)}</small></article>`).join("");
  }

  function renderTeams(teams) {
    state.projections = teams;
    const totalWeeks = horizonWeeks().length;
    $("#sleeperTeams").innerHTML = teams.map((team, index) => {
      const proj = team.projection;
      const coverage = proj.slots ? Math.round(100 * proj.modeled / proj.slots) : 0;
      return `<tr class="${team.mine ? "league-mine" : ""}"><td class="rank">${index + 1}</td>
        <td><button class="league-team-link" data-sleeper-roster="${team.roster.roster_id}"><strong>${safe(team.team)}${team.mine ? " ★" : ""}</strong><small>${safe(team.manager)}</small></button></td>
        <td>${currentRecords(team.roster)}</td><td class="league-point-value">${num(proj.total)}</td>
        <td><span class="league-coverage ${coverage < 75 ? "low" : ""}">${coverage}% · ${totalWeeks} wk${totalWeeks === 1 ? "" : "s"}</span></td>
        <td><button class="lab-open" data-sleeper-roster="${team.roster.roster_id}">LINEUP ↗</button></td></tr>`;
    }).join("") || '<tr><td colspan="6" class="table-loading">No fantasy teams returned for this league.</td></tr>';
  }

  async function ensureMatchups(week) {
    if (state.matchups.has(week)) return state.matchups.get(week);
    try {
      const matchups = await sleeperGet(`/league/${state.leagueId}/matchups/${week}`);
      state.matchups.set(week, Array.isArray(matchups) ? matchups : []);
    } catch { state.matchups.set(week, []); }
    return state.matchups.get(week);
  }

  function renderMatchups(teams) {
    const el = $("#sleeperMatchups");
    if (state.horizon !== "week") {
      el.innerHTML = `<div class="league-section-label"><h2>${state.horizon === "four" ? "Four-week" : "Remaining-season"} outlook</h2><p>Aggregate starter totals; individual matchup pairings shown only for one selected week.</p></div>`;
      return;
    }
    const matches = state.matchups.get(state.week) || [];
    const grouped = new Map();
    for (const entry of matches) {
      if (entry.matchup_id == null) continue;
      if (!grouped.has(entry.matchup_id)) grouped.set(entry.matchup_id, []);
      grouped.get(entry.matchup_id).push(entry.roster_id);
    }
    const pairs = [...grouped.values()].filter(ids => ids.length === 2).map(ids => ids.map(id => teams.find(t => +t.roster.roster_id === +id)));
    if (!pairs.length) { el.innerHTML = '<div class="lab-status">Sleeper matchup pairings are not published for this week. Team forecasts remain available below.</div>'; return; }
    el.innerHTML = `<div class="league-section-label"><h2>Week ${state.week} matchups <span class="title-dot">.</span></h2><p>Projected optimized starters. Live Sleeper points are excluded from this Week 9-cutoff model.</p></div>
      <div class="league-matchup-grid">${pairs.filter(pair => pair.every(Boolean)).map(([left, right]) => {
        const delta = left.projection.total - right.projection.total;
        return `<article class="league-matchup"><div><small>${safe(left.manager)}</small><strong>${safe(left.team)}</strong><span>${num(left.projection.total)} pts</span></div>
          <em>vs</em><div><small>${safe(right.manager)}</small><strong>${safe(right.team)}</strong><span>${num(right.projection.total)} pts</span></div>
          <p>Projected margin: ${num(Math.abs(delta))} pts · ${safe(delta >= 0 ? left.team : right.team)} favored</p></article>`;
      }).join("")}</div>`;
  }

  function renderDetail(teams) {
    const selected = teams.find(team => +team.roster.roster_id === +state.selectedRoster) || teams.find(t => t.mine) || teams[0];
    if (!selected) return;
    state.selectedRoster = selected.roster.roster_id;
    const details = selected.projection.lineups[0];
    if (!details) return;
    const bySlot = details.lineup.map(item => `<tr><td><span class="league-slot">${safe(item.slot.replaceAll("_", " "))}</span></td>
      <td>${safe(item.name)}<small>${safe(item.position || "UNKNOWN")} ${item.team ? "· " + safe(item.team) : ""}</small></td>
      <td class="${item.modeled ? "league-projected" : ""}">${item.projection == null ? "NO MODEL" : num(item.projection)}</td></tr>`).join("");
    const included = new Set(details.lineup.map(item => String(item.id)));
    const missing = selected.candidates.filter(item => !item.model && ["QB", "RB", "WR", "TE"].includes(item.position));
    const bench = selected.candidates.filter(item => !included.has(String(item.id)) && ["QB", "RB", "WR", "TE"].includes(item.position));
    $("#sleeperDetail").innerHTML = `<div class="league-section-label"><h2>${safe(selected.team)} <span class="title-dot">.</span></h2>
      <p>Optimized Week ${details.week} modeled lineup · ${num(details.total)} starter points · ${details.modeled}/${details.slots} modeled slots</p></div>
      <div class="league-detail-grid"><section class="lab-signal-panel"><span class="microtag">PROJECTED STARTING LINEUP</span>
        <div class="table-scroller"><table class="league-detail-table"><thead><tr><th>SLOT</th><th>PLAYER</th><th>W${details.week} PTS</th></tr></thead><tbody>${bySlot}</tbody></table></div></section>
        <section class="lab-signal-panel"><span class="microtag">ROSTER CONTEXT</span>
          <div class="league-detail-stat"><span>Full roster players matched to forecast</span><strong>${selected.covered}/${selected.eligible}</strong></div>
          <div class="league-detail-stat"><span>Modeled starter points this week</span><strong>${num(details.total)}</strong></div>
          <div class="league-detail-stat"><span>Players without a model projection</span><strong>${missing.length}</strong></div>
          <p>Other eligible roster players (${bench.length}): ${bench.length ? safe(bench.slice(0, 12).map(item => item.name).join(", ")) : "None"}${bench.length > 12 ? "…" : ""}.</p>
          <p>These are optimized, hypothetical starters—not the manager's submitted lineup. Players absent from the 251-player model are not assigned invented fantasy values.</p></section></div>`;
  }

  async function renderAll() {
    if (!state.league || !state.research) return;
    const teams = projectedTeams();
    renderOverview(teams);
    renderTeams(teams);
    if (state.horizon === "week") await ensureMatchups(state.week);
    renderMatchups(teams);
    renderDetail(teams);
  }

  async function loadLeague(force = false) {
    if (state.loading) return;
    const id = parseLeagueId($("#sleeperLeagueId").value);
    if (!id) { setStatus("Enter a valid numeric Sleeper league ID or a Sleeper league URL.", true); return; }
    if (!force && state.league && id === state.leagueId) { await renderAll(); return; }
    state.loading = true;
    $("#sleeperConnect").disabled = true;
    setStatus("Fetching league, teams and roster data from Sleeper's free public API…");
    try {
      const [league, rosters, users, research] = await Promise.all([
        sleeperGet(`/league/${id}`), sleeperGet(`/league/${id}/rosters`),
        sleeperGet(`/league/${id}/users`),
        fetch("./data/research-v1.json", { cache: "no-store" }).then(response => {
          if (!response.ok) throw Error("Research forecast file not available");
          return response.json();
        })
      ]);
      if (!league || league.sport !== "nfl") throw Error("Sleeper league ID was not found as an NFL league");
      if (String(league.season) !== "2026") throw Error(`League ID belongs to ${league.season}, but the frozen forecast is for 2026. Enter the 2026 Sleeper league ID.`);
      if (!Array.isArray(rosters) || !Array.isArray(users) || !Array.isArray(research.players) || research.meta?.last_observed_week !== 9)
        throw Error("Unexpected Sleeper or forecast data shape");
      setStatus("Matching Sleeper player IDs to NFL projection identifiers…");
      const catalog = await loadPlayerCatalog();
      state.leagueId = id; state.league = league; state.rosters = rosters; state.users = users;
      state.catalog = catalog; state.research = research; state.matchups = new Map();
      state.selectedRoster = null;
      remember(KEY_LEAGUE, id);
      $("#sleeperControls").hidden = false;
      setStatus(`${league.name} loaded: ${rosters.length} teams. ${scoringNotice()}`);
      await renderAll();
    } catch (error) {
      setStatus(`Unable to load Sleeper league: ${error.message || "network error"}. Check the league ID and try Refresh. No payment or sign-in is needed.`, true);
      console.error("Sleeper league integration:", error);
    } finally { state.loading = false; $("#sleeperConnect").disabled = false; }
  }

  function bind() {
    const saved = cached(KEY_LEAGUE);
    if (saved && parseLeagueId(saved)) $("#sleeperLeagueId").value = saved;
    $("#sleeperConnect").addEventListener("click", () => loadLeague(true));
    $("#sleeperLeagueId").addEventListener("keydown", event => { if (event.key === "Enter") loadLeague(true); });
    $("#sleeperWeek").addEventListener("change", async event => { state.week = +event.target.value; await renderAll(); });
    document.querySelectorAll("[data-league-horizon]").forEach(btn => btn.addEventListener("click", async () => {
      state.horizon = btn.dataset.leagueHorizon;
      document.querySelectorAll("[data-league-horizon]").forEach(item => item.classList.toggle("active", item === btn));
      await renderAll();
    }));
    $("#sleeperTeams").addEventListener("click", event => {
      const selected = event.target.closest("[data-sleeper-roster]");
      if (selected) { state.selectedRoster = selected.dataset.sleeperRoster; renderDetail(state.projections); $("#sleeperDetail").scrollIntoView({ behavior: "smooth", block: "start" }); }
    });
  }

  window.SidelineSleeper = { onView() {
    state.active = true;
    if (!state.league && !state.loading) loadLeague();
  } };
  bind();
})();
