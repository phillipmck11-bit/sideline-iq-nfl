(() => {
  "use strict";

  const state = {
    payload: null, season: "2026", position: "ALL", team: "ALL",
    games: 0, query: "", hideByes: false, sort: "expected_ppg",
    sortDir: "desc", visible: 35, compare: [null, null], drawer: null,
    projectionMode: "stat-first",
  };
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const num = (value, digits = 1) => Number.isFinite(+value) ? (+value).toFixed(digits) : "—";
  const commas = (value) => Number(value).toLocaleString("en-US");
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);
  const signed = (value) => (value > 0 ? "+" : "") + num(value);
  const trendClass = (delta) => delta > .05 ? "delta-pos" : delta < -.05 ? "delta-neg" : "delta-neutral";
  const activeRows = () => {
    const rows = state.payload?.seasons?.[state.season] ?? [];
    if (state.season !== "2026" || state.projectionMode === "stat-first") return rows;
    const fallback = rows.map(p => ({ ...p,
      expected_ppg: p.baseline_expected_ppg,
      stat_line: p.baseline_stat_line,
      projection_model: "65/35 historical-stat baseline",
      delta: +(p.baseline_expected_ppg - p.ppg).toFixed(2),
    }));
    const positions = { QB: 0, RB: 0, WR: 0, TE: 0 };
    fallback.sort((a, b) => b.expected_ppg - a.expected_ppg || a.name.localeCompare(b.name));
    fallback.forEach(p => { p.position_rank = ++positions[p.position]; });
    return fallback;
  };

  function view(name) {
    $$(".view").forEach(item => item.classList.toggle("active", item.id === "view-" + name));
    $$(".nav-item").forEach(item => {
      const active = item.dataset.view === name;
      item.classList.toggle("active", active);
      active ? item.setAttribute("aria-current", "page") : item.removeAttribute("aria-current");
    });
    const headings = { rankings: "PLAYER RANKINGS", forecasts: "MULTI-GAME FORECASTS", value: "VALUE SIGNALS", comparison: "PLAYER COMPARISON", research: "MODEL RESEARCH", methodology: "SCORING & METHODS" };
    $("#breadcrumb").textContent = headings[name];
    $(".sidebar").classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (name === "comparison") renderComparison();
    if (name === "research") renderResearch();
    if (name === "forecasts" || name === "value") window.SidelineResearch?.onView(name);
  }

  function renderHero() {
    const meta = state.payload.meta;
    const rows = activeRows();
    const top = rows.filter(p => state.season === "2025" || p.opponent !== "BYE")
      .slice().sort((a, b) => b.expected_ppg - a.expected_ppg).slice(0, 4);
    const high = Math.max(...top.map(p => p.expected_ppg), 1);
    $("#heroLeaders").innerHTML = top.map((p, index) => `
      <div class="leader-row">
        <span class="leader-num">0${index + 1}</span>
        <div class="leader-meta"><div class="leader-name">${escape(p.name)} <span style="color:#7192a3">· ${p.position}</span></div>
        <div class="leader-track"><div class="leader-fill" style="width:${(100 * p.expected_ppg / high).toFixed(1)}%"></div></div></div>
        <strong class="leader-pts">${num(p.expected_ppg)}</strong>
      </div>`).join("");
    $("#heroWeek").textContent = state.season === "2026" ? "WK " + meta.target_week : "2025";
    $("#heroModelLabel").textContent = state.season === "2026"
      ? (state.projectionMode === "stat-first" ? "STAT-FIRST MODEL" : "65/35 BASELINE")
      : "2025 RETROSPECTIVE";
    $("#sidebarWeek").textContent = meta.target_week;
    $("#headerSeason").textContent = state.season;
    $("#metricPlayers").textContent = commas(rows.length);
    $("#metricTeams").textContent = [...new Set(rows.map(p => p.team))].length;
    const best = top[0];
    $("#metricTop").textContent = best ? num(best.expected_ppg) : "—";
    $("#metricTopName").textContent = best ? best.name : "";
    const bye = [...new Set(rows.filter(p => p.opponent === "BYE").map(p => p.team))];
    $("#metricByes").textContent = state.season === "2026" ? String(bye.length).padStart(2, "0") : "—";
    $("#metricByes").parentElement.querySelector("small").textContent = state.season === "2026"
      ? bye.join(" · ") : "2025 is a retrospective view";
    $("#countAll").textContent = rows.length;
    $("#boardDescription").textContent = state.season === "2026"
      ? `Week ${meta.target_week} ${state.projectionMode === "stat-first" ? "stat-first model" : "65/35 baseline"} · completed data through Week ${meta.last_observed_week}`
      : "2025 retrospective season form · not a future-game prediction";
    $("#tableFootnote").textContent = state.season === "2026"
      ? state.projectionMode === "stat-first"
        ? "2025-trained, 2026-validated stat-first forecasts. All projected points come from a reconciled box score; selected opponent history is included."
        : "Comparison view: 65% last four + 35% season per stat. Advanced opponent adjustments are still experimental."
      : "2025 estimated PPG represents end-of-season form, not an out-of-sample pregame forecast.";
    $("#byeFilterLabel").hidden = state.season === "2025";
    $("#modelFilterWrap").hidden = state.season === "2025";
  }

  function populateTeams() {
    const teams = [...new Set(activeRows().map(p => p.team))].filter(Boolean).sort();
    const selected = state.team;
    $("#teamFilter").innerHTML = '<option value="ALL">All teams</option>' + teams.map(
      team => `<option value="${escape(team)}">${escape(team)}</option>`).join("");
    $("#teamFilter").value = teams.includes(selected) ? selected : "ALL";
    state.team = $("#teamFilter").value;
  }

  function filteredRows() {
    const query = state.query.toLowerCase().trim();
    const filtered = activeRows().filter(p =>
      (state.position === "ALL" || p.position === state.position) &&
      (state.team === "ALL" || p.team === state.team) &&
      p.games >= state.games &&
      (!state.hideByes || state.season !== "2026" || p.opponent !== "BYE") &&
      (!query || (`${p.name} ${p.team} ${p.position} ${p.opponent || ""}`).toLowerCase().includes(query))
    );
    const key = state.sort;
    const sign = state.sortDir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      const first = a[key], second = b[key];
      const comparison = typeof first === "string"
        ? String(first).localeCompare(String(second))
        : (+first - +second);
      return sign * comparison || a.name.localeCompare(b.name);
    });
  }

  function describeOpponent(p) {
    if (p.opponent === "BYE") return '<span class="trend-tag bye">BYE WEEK</span>';
    if (!p.defense) return '<span class="trend-tag">NO DATA</span>';
    const d = p.defense;
    const label = p.position === "RB"
      ? `RUSH ${num(d.explosive_rushes_allowed_pg)} /G`
      : `PASS ${num(d.explosive_passes_allowed_pg)} /G`;
    return `<span class="trend-tag" title="Opponent explosive plays allowed per game over four earlier games. Some matchup statistics are used by stat-first models; quality-adjusted defenses are still experimental.">${label}</span>`;
  }

  function renderRankings() {
    const rows = filteredRows();
    $("#rowCount").textContent = commas(rows.length);
    const now = rows.slice(0, state.visible);
    $("#rankBody").innerHTML = now.length ? now.map(p => {
      const selected = state.compare.includes(p.id);
      const opponent = state.season === "2025" ? '<span class="away-home">REVIEW</span>' :
        p.opponent === "BYE" ? '<span class="bye">BYE</span>' :
        `<span class="away-home">${p.home_away === "home" ? "vs" : "@"}</span> ${escape(p.opponent)}`;
      return `<tr data-id="${escape(p.id)}">
        <td class="rank">${p.position_rank}</td>
        <td class="player-cell" data-inspect="${escape(p.id)}" title="Open ${escape(p.name)} details">
          <div class="player-primary"><span class="position-mark ${p.position}">${p.position}</span>
          <span><span class="player-name">${escape(p.name)}</span><span class="player-sub" style="display:block">${escape(p.team)} · ${p.games} recorded games</span></span></div>
        </td>
        <td class="opponent-cell">${opponent}</td>
        <td class="point-value">${num(p.ppg)}</td>
        <td class="point-value">${num(p.recent_ppg)}</td>
        <td class="projection"><button class="projection-open" data-inspect="${escape(p.id)}"
          aria-label="View ${escape(p.name)} projected stat line" title="View the stats behind this projection">
          <strong>${num(p.expected_ppg)}</strong><small>VIEW STATS ↗</small></button></td>
        <td class="${trendClass(p.delta)}">${signed(p.delta)}</td>
        <td>${state.season === "2025" ? '<span class="trend-tag">HISTORICAL</span>' : describeOpponent(p)}</td>
        <td><button class="row-compare ${selected ? "selected" : ""}" data-pin="${escape(p.id)}"
          title="${selected ? "Remove from" : "Add to"} player comparison" aria-label="${selected ? "Remove" : "Add"} ${escape(p.name)} ${selected ? "from" : "to"} comparison">${selected ? "✓" : "+"}</button></td>
      </tr>`;
    }).join("") : '<tr><td colspan="9" class="table-loading">No players match these filters. Try adjusting your search.</td></tr>';
    $("#loadMore").hidden = rows.length <= state.visible;
    $$(".sort-btn").forEach(btn => {
      btn.classList.toggle("current", btn.dataset.sort === state.sort);
      btn.setAttribute("aria-label", `Sort by ${btn.textContent.trim()}`);
    });
  }

  function renderAccuracyMini() {
    const research = state.payload.research;
    $("#accuracyMini").innerHTML = ["QB", "RB", "WR", "TE"].map(position => {
      const r = research.find(item => item.position === position);
      return `<div class="accuracy-position"><span>${position}</span><strong>${num(r.mae_gain, 2)} <span style="font-size:11px">↓</span></strong><small>2026 FP MAE gain vs baseline</small></div>`;
    }).join("");
  }

  function updateComparisons() {
    const rows = activeRows().slice().sort((a,b) => a.name.localeCompare(b.name));
    const options = '<option value="">Choose a player</option>' + rows.map(
      p => `<option value="${escape(p.id)}">${escape(p.name)} (${p.position} · ${p.team})</option>`).join("");
    $("#compareFirst").innerHTML = options;
    $("#compareSecond").innerHTML = options;
    if (state.compare[0] && !rows.some(p => p.id === state.compare[0])) state.compare[0] = null;
    if (state.compare[1] && !rows.some(p => p.id === state.compare[1])) state.compare[1] = null;
    $("#compareFirst").value = state.compare[0] ?? "";
    $("#compareSecond").value = state.compare[1] ?? "";
    $("#compareNavCount").textContent = state.compare.filter(Boolean).length;
  }

  function toggleCompare(id) {
    const before = state.compare.indexOf(id);
    if (before >= 0) {
      state.compare[before] = null;
    } else if (!state.compare[0]) {
      state.compare[0] = id;
    } else {
      state.compare[1] = id;
    }
    updateComparisons();
    renderRankings();
    if ($("#view-comparison").classList.contains("active")) renderComparison();
  }

  function trendSVG(trend, color = "#c7f16b") {
    if (!trend?.length) return '<p>No weekly history available.</p>';
    const values = trend.map(t => +t.points);
    const max = Math.max(...values, 4);
    const min = Math.min(0, ...values);
    const span = max - min || 1;
    const left = 13, right = 368, top = 10, bottom = 91;
    const coords = values.map((value, i) => [
      left + i * (right - left) / Math.max(1, values.length - 1),
      bottom - (value - min) / span * (bottom - top),
    ]);
    const points = coords.map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const area = `${left},${bottom} ${points} ${coords.at(-1)[0]},${bottom}`;
    const grid = [0, .5, 1].map(frac => `<line x1="10" y1="${top + frac * (bottom - top)}" x2="375" y2="${top + frac * (bottom - top)}" stroke="#35495b" stroke-dasharray="3 5" stroke-width="0.7"/>`).join("");
    return `<svg class="trend-chart" viewBox="0 0 380 115" role="img" aria-label="Weekly fantasy points trend">
      ${grid}<polygon points="${area}" fill="${color}" opacity=".08"/>
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${coords.map(([x,y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${color}" stroke="#0c1725" stroke-width="1"/>`).join("")}
      <text x="12" y="111" fill="#7f96ab" font-size="10">W${trend[0].week}</text>
      <text x="367" y="111" text-anchor="end" fill="#7f96ab" font-size="10">W${trend.at(-1).week}</text>
    </svg>`;
  }

  function projectedStatFields(p) {
    const s = p.stat_line;
    if (!s) return [];
    const field = (label, key, digits = 1) => ({label, value: num(s[key], digits)});
    if (p.position === "QB") return [
      field("Pass attempts", "attempts"),
      field("Pass yards", "passing_yards"), field("Pass TDs", "passing_tds", 2),
      field("Interceptions", "passing_interceptions", 2),
      field("Rush attempts", "carries"),
      field("Rush yards", "rushing_yards"), field("Rush TDs", "rushing_tds", 2),
    ];
    const base = p.position === "RB" ? [
      field("Rush attempts", "carries"), field("Rush yards", "rushing_yards"),
      field("Rush TDs", "rushing_tds", 2), field("Receptions", "receptions"),
      field("Rec yards", "receiving_yards"), field("Rec TDs", "receiving_tds", 2),
    ] : [
      field("Targets", "targets"), field("Receptions", "receptions"),
      field("Rec yards", "receiving_yards"), field("Rec TDs", "receiving_tds", 2),
    ];
    if (p.position !== "RB" && (s.rushing_yards !== 0 || s.rushing_tds !== 0)) {
      base.push(field("Rush yards", "rushing_yards"), field("Rush TDs", "rushing_tds", 2));
    }
    if (s.passing_yards !== 0 || s.passing_tds !== 0 || s.passing_interceptions !== 0) {
      base.push(field("Pass yards", "passing_yards"), field("Pass TDs", "passing_tds", 2),
        field("Interceptions", "passing_interceptions", 2));
    }
    base.push({label: "Rush + rec TDs", value: num(s.rushing_tds + s.receiving_tds, 2)});
    return base;
  }

  function scoringComponents(p) {
    const s = p.stat_line;
    if (!s) return [];
    const receptionBonus = p.position === "TE" ? 1.5 : p.position === "QB" ? 0 : 1;
    return [
      { label: "Passing yards", points: .05 * s.passing_yards },
      { label: "Passing TDs", points: 4 * s.passing_tds },
      { label: "Interceptions", points: -2 * s.passing_interceptions },
      { label: "Rushing yards", points: .1 * s.rushing_yards },
      { label: "Rushing TDs", points: 6 * s.rushing_tds },
      { label: "Receiving yards", points: .1 * s.receiving_yards },
      { label: "Receiving TDs", points: 6 * s.receiving_tds },
      { label: "Receptions", points: receptionBonus * s.receptions },
    ];
  }

  function projectedStatPanel(p) {
    const fields = projectedStatFields(p);
    if (!fields.length) return "";
    const tag = state.season === "2025" ? "RETROSPECTIVE 65/35"
      : state.projectionMode === "stat-first" ? "STAT-FIRST · 2026 VALIDATED" : "65/35 BASELINE";
    const contributions = scoringComponents(p);
    const calculated = contributions.reduce((sum, item) => sum + item.points, 0);
    return `<div class="drawer-section projected-line">
      <div class="statline-heading"><h3>${state.season === "2026" ? "Projected stat line" : "Retrospective stat averages"}</h3>
        <span class="microtag">${tag}</span></div>
      <div class="statline-grid">${fields.map(item => `
        <div class="statline-cell"><small>${escape(item.label)}</small><strong>${item.value}</strong></div>`).join("")}</div>
      <div class="statline-heading points-heading"><h3>How those stats score</h3><span class="microtag">EXACT LEAGUE RULES</span></div>
      <div class="point-breakdown">${contributions.filter(item => Math.abs(item.points) > .001).map(item => `<div><span>${escape(item.label)}</span>
          <strong class="${item.points < 0 ? "negative" : ""}">${item.points > 0 ? "+" : ""}${num(item.points, 2)}</strong></div>`).join("")}</div>
      <div class="point-total"><span>PROJECTED TOTAL</span><strong>${num(calculated, 2)} pts</strong></div>
      <p>${p.opponent === "BYE" && state.season === "2026" ? "BYE week: no game, so all projected stats and points are zero. " : ""}
        Fractional counts and touchdowns represent expected averages; displayed stat values are rounded, while
        the fantasy total is calculated from full-precision estimates.</p>
    </div>`;
  }

  function compareCard(p) {
    return `<article class="compare-card">
      <span class="microtag">${escape(p.position)} · ${escape(p.team)}</span>
      <h2>${escape(p.name)}</h2><div class="identity">${p.opponent && p.opponent !== "BYE" ? `Week ${state.payload.meta.target_week} ${p.home_away === "home" ? "vs" : "@"} ${p.opponent}` : state.season === "2025" ? "2025 season review" : "BYE WEEK"}</div>
      <div class="big-proj">${num(p.expected_ppg)}</div><div class="big-proj-label">${state.season === "2026" ? "PROJECTED FANTASY POINTS" : "RETROSPECTIVE FORM ESTIMATE"}</div>
      <div class="compare-statline">${projectedStatFields(p).filter(item => item.label !== "Targets" && item.label !== "Rush attempts")
        .map(item => `<span><strong>${item.value}</strong> ${escape(item.label)}</span>`).join("")}</div>
      <div class="compare-stat-grid">
        <div class="compare-stat"><small>SEASON PPG</small><strong>${num(p.ppg)}</strong></div>
        <div class="compare-stat"><small>LAST FOUR PPG</small><strong>${num(p.recent_ppg)}</strong></div>
        <div class="compare-stat"><small>DELTA VS SEASON</small><strong class="${trendClass(p.delta)}">${signed(p.delta)}</strong></div>
        <div class="compare-stat"><small>RECORDED GAMES</small><strong>${p.games}</strong></div>
      </div>
      <div class="chart-caption">WEEKLY POINTS UNDER YOUR SCORING</div>
      ${trendSVG(p.trend)}
    </article>`;
  }

  function renderComparison() {
    const [firstId, secondId] = state.compare;
    const rows = activeRows();
    const first = rows.find(p => p.id === firstId);
    const second = rows.find(p => p.id === secondId);
    if (!first || !second || first.id === second.id) {
      $("#compareResults").innerHTML = '<div class="empty-state wide">Choose two different players above, or press + on two rows in the rankings.</div>';
      return;
    }
    $("#compareResults").innerHTML = compareCard(first) + compareCard(second);
  }

  function renderResearch() {
    $("#researchCards").innerHTML = ["QB", "RB", "WR", "TE"].map(position => {
      const r = state.payload.research.find(item => item.position === position);
      const worseRmse = r.model_rmse > r.baseline_rmse;
      return `<article class="research-card">
        <div class="research-card-top"><strong>${position}</strong><span class="research-signal ${r.signal ? "good" : ""}">${r.signal ? "SIGNAL" : "MIXED"}</span></div>
        <div class="error-label">2026 FROZEN STAT-FIRST MAE / FANTASY PTS</div>
        <div class="error-main">${num(r.model_mae, 2)} <span>↓ ${num(r.mae_gain, 2)} vs 65/35</span></div>
        <div class="error-data">
          <div class="error-row"><span>65/35 stat baseline MAE</span><strong>${num(r.baseline_mae, 2)}</strong></div>
          <div class="error-row"><span>Model RMSE</span><strong class="${worseRmse ? "bad" : ""}">${num(r.model_rmse, 2)}</strong></div>
          <div class="error-row"><span>Baseline RMSE</span><strong>${num(r.baseline_rmse, 2)}</strong></div>
          <div class="error-row"><span>Player-games</span><strong>${commas(r.player_games)}</strong></div>
          <div class="error-row"><span>95% MAE gain CI</span><strong>${num(r.ci_low, 2)} to ${num(r.ci_high, 2)}</strong></div>
          <div class="error-row"><span>Adjusted-defense experiment*</span><strong>${signed(r.matchup_mae_gain)}</strong></div>
        </div>
      </article>`;
    }).join("");
  }

  function drawerFeature(label, value, suffix = "") {
    return `<div class="drawer-feature"><span>${escape(label)}</span><strong class="${value == null ? "missing" : ""}">${value == null ? "NOT VERIFIED" : escape(String(value) + suffix)}</strong></div>`;
  }

  function renderDrawer(p) {
    const m = p.profile, d = p.defense;
    const details = p.position === "QB" ? [
      ["Air yards / passing attempt", m.passing_air_yards_per_attempt, " yd"],
      ["Rushing yards over expected", null, ""],
      ["Rushes inside opponent 10", null, ""],
      ["Opp. explosive passes / game", d?.explosive_passes_allowed_pg, ""],
      ["Opp. explosive rushes / game", d?.explosive_rushes_allowed_pg, ""]
    ] : p.position === "RB" ? [
      ["Rushing attempts / game", m.carries_pg, ""],
      ["Rush yards / carry", m.rush_yards_per_carry, ""],
      ["Rushing yards over expected", null, ""],
      ["Opp. explosive rushes / game", d?.explosive_rushes_allowed_pg, ""],
      ["Opp. explosive rush rate", d?.explosive_rush_rate, "%"],
    ] : [
      ["Player targets / game", m.targets_pg, ""],
      ["Player air yards / target", m.receiving_air_yards_per_target, " yd"],
      ["Player YAC / reception", m.yac_per_reception, " yd"],
      ["Opp. explosive passes / game", d?.explosive_passes_allowed_pg, ""],
      ["Opp. air yards allowed / game", d?.air_yards_allowed_pg, " yd"],
      ["Opp. YAC allowed / game", d?.yac_allowed_pg, " yd"],
      ["Slot / outside / inline split", null, ""],
    ];
    $("#drawerContent").innerHTML = `<div class="drawer-body">
      <div class="drawer-identity"><span class="position-mark ${p.position}">${p.position}</span><div>
        <div class="drawer-name">${escape(p.name)}</div>
        <div class="drawer-description">${p.team} · ${p.position} · ${p.games} games observed
         ${p.opponent && state.season === "2026" ? " · " + (p.opponent === "BYE" ? "BYE" : p.home_away === "home" ? "vs " + p.opponent : "@ " + p.opponent) : ""}</div>
      </div></div>
      <div class="drawer-projection"><small>${state.season === "2026" ? "WEEK " + state.payload.meta.target_week + " PROJECTION" : "2025 RETROSPECTIVE FORM"}</small>
        <strong>${num(p.expected_ppg)}</strong><span>fantasy pts</span></div>
      ${projectedStatPanel(p)}
      <div class="drawer-two"><div><small>SEASON PPG</small><strong>${num(p.ppg)}</strong></div><div><small>LAST 4 PPG</small><strong>${num(p.recent_ppg)}</strong></div></div>
      <div class="drawer-section"><h3>Weekly production</h3>${trendSVG(p.trend)}<p>Each point reflects only your league's stated scoring categories.</p></div>
      <div class="drawer-section"><h3>Player & opponent lens</h3>${details.map(a => drawerFeature(...a)).join("")}
        <p>The stat-first model includes pregame opponent tendencies, but quality-adjusted defensive upgrades remain <strong>experimental</strong> until additional holdout validation.</p></div>
      <button class="primary-btn drawer-add" data-drawer-pin="${escape(p.id)}">${state.compare.includes(p.id) ? "Remove from comparison" : "+ Add to comparison"}</button>
    </div>`;
  }

  function openDrawer(id) {
    const p = activeRows().find(item => item.id === id);
    if (!p) return;
    state.drawer = id;
    renderDrawer(p);
    $("#drawerBackdrop").hidden = false;
    $("#playerDrawer").hidden = false;
    $("#drawerClose").focus();
    document.body.style.overflow = "hidden";
  }
  function closeDrawer() {
    $("#drawerBackdrop").hidden = true;
    $("#playerDrawer").hidden = true;
    document.body.style.overflow = "";
    state.drawer = null;
  }

  function downloadCsv() {
    const columns = ["position_rank", "name", "position", "team", "opponent", "home_away",
      "games", "ppg", "recent_ppg", "expected_ppg", "delta", "projection_model",
      "baseline_expected_ppg", ...[
        "attempts", "passing_yards", "passing_tds", "passing_interceptions",
        "carries", "rushing_yards", "rushing_tds", "targets", "receptions",
        "receiving_yards", "receiving_tds",
      ].map(name => "projected_" + name)];
    const values = filteredRows();
    const csvField = value => '"' + String(value ?? "").replace(/"/g, '""') + '"';
    const cell = (p, key) => key.startsWith("projected_") ? p.stat_line?.[key.slice(10)] : p[key];
    const lines = [columns.join(","), ...values.map(p => columns.map(key => csvField(cell(p, key))).join(","))];
    const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const anchor = document.createElement("a");
    const url = URL.createObjectURL(blob);
    anchor.href = url;
    const suffix = state.season === "2026" ? `week${state.payload.meta.target_week}-${state.projectionMode}` : "season";
    anchor.download = `sideline-iq-${state.season}-${suffix}-custom-scoring.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 200);
  }

  function refreshSeason() {
    state.visible = 35;
    state.compare = [null, null];
    state.team = "ALL";
    state.hideByes = false;
    $("#hideByes").checked = false;
    renderHero();
    populateTeams();
    updateComparisons();
    renderRankings();
  }

  function bindEvents() {
    $$(".nav-item").forEach(btn => btn.addEventListener("click", () => view(btn.dataset.view)));
    $$("[data-go]").forEach(btn => btn.addEventListener("click", () => view(btn.dataset.go)));
    $("#menuToggle").addEventListener("click", () => $(".sidebar").classList.toggle("open"));
    $("#jumpRankings").addEventListener("click", () => $("#rankingsAnchor").scrollIntoView({ behavior: "smooth" }));
    $("#seasonSelect").addEventListener("change", e => { state.season = e.target.value; refreshSeason(); });
    $("#modelSelect").addEventListener("change", e => {
      state.projectionMode = e.target.value;
      state.visible = 35;
      renderHero();
      renderRankings();
      if ($("#view-comparison").classList.contains("active")) renderComparison();
      if (state.drawer) {
        const p = activeRows().find(item => item.id === state.drawer);
        if (p) renderDrawer(p);
      }
    });
    $$(".position-tab").forEach(btn => btn.addEventListener("click", () => {
      state.position = btn.dataset.position;
      state.visible = 35;
      $$(".position-tab").forEach(item => item.classList.toggle("active", item === btn));
      renderRankings();
    }));
    $("#playerSearch").addEventListener("input", e => { state.query = e.target.value; state.visible = 35; renderRankings(); });
    $("#teamFilter").addEventListener("change", e => { state.team = e.target.value; state.visible = 35; renderRankings(); });
    $("#gamesFilter").addEventListener("change", e => { state.games = +e.target.value; state.visible = 35; renderRankings(); });
    $("#hideByes").addEventListener("change", e => { state.hideByes = e.target.checked; state.visible = 35; renderRankings(); });
    $$(".sort-btn").forEach(btn => btn.addEventListener("click", () => {
      const key = btn.dataset.sort;
      state.sortDir = state.sort === key && state.sortDir === "desc" ? "asc" : "desc";
      state.sort = key;
      state.visible = 35;
      renderRankings();
    }));
    $("#loadMore").addEventListener("click", () => { state.visible += 45; renderRankings(); });
    $("#exportCsv").addEventListener("click", downloadCsv);
    $("#rankBody").addEventListener("click", e => {
      const pinned = e.target.closest("[data-pin]");
      const inspected = e.target.closest("[data-inspect]");
      if (pinned) toggleCompare(pinned.dataset.pin);
      else if (inspected) openDrawer(inspected.dataset.inspect);
    });
    $("#compareFirst").addEventListener("change", e => { state.compare[0] = e.target.value || null; updateComparisons(); renderComparison(); });
    $("#compareSecond").addEventListener("change", e => { state.compare[1] = e.target.value || null; updateComparisons(); renderComparison(); });
    $("#drawerClose").addEventListener("click", closeDrawer);
    $("#drawerBackdrop").addEventListener("click", closeDrawer);
    $("#playerDrawer").addEventListener("click", e => {
      const pin = e.target.closest("[data-drawer-pin]");
      if (pin) {
        toggleCompare(pin.dataset.drawerPin);
        const p = activeRows().find(x => x.id === pin.dataset.drawerPin);
        if (p) renderDrawer(p);
      }
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && state.drawer) closeDrawer(); });
  }

  async function start() {
    bindEvents();
    try {
      const response = await fetch("./data/dashboard.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Data response ${response.status}`);
      state.payload = await response.json();
      if (!state.payload.seasons?.["2026"]?.length) throw new Error("Empty rankings");
      renderHero();
      populateTeams();
      renderRankings();
      renderAccuracyMini();
      updateComparisons();
    } catch (error) {
      $("#loadError").hidden = false;
      $("#rankBody").innerHTML = '<tr><td colspan="9" class="table-loading">Unable to load rankings data.</td></tr>';
      console.error(error);
    }
  }

  start();
})();

