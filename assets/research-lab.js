(() => {
  "use strict";

  // The two research views use one immutable, local JSON snapshot. No backend,
  // credentials, analytics calls, paid services or GitHub-hosted compute.
  const state = { snapshot: null, forecastSearch: "", forecastPos: "ALL", valueSearch: "",
    valuePos: "ALL", sort: "next", descending: true, visible: 45, active: "", drawer: null };
  const $ = (selector) => document.querySelector(selector);
  const safe = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);
  const formatted = (n, digits = 1) => n == null || !Number.isFinite(+n) ? "—" : Number(n).toFixed(digits);
  const signed = (n) => (Number(n) > 0 ? "+" : "") + formatted(n, 2);
  const points = (p, horizon) => horizon === "next" ? p.next_game.fantasy_points
    : horizon === "four" ? p.next_four.fantasy_points : p.rest_of_season.fantasy_points;
  const sortBy = (p) => state.sort === "gap" ? p.gap : points(p, state.sort);
  const gapClass = (gap) => gap > .05 ? "lab-up" : gap < -.05 ? "lab-down" : "lab-neutral";

  function forecastPlayers() {
    const search = state.forecastSearch.toLowerCase();
    return state.snapshot.players.filter(p =>
      (state.forecastPos === "ALL" || p.position === state.forecastPos) &&
      `${p.player} ${p.team} ${p.position} ${p.next_game.opponent}`.toLowerCase().includes(search)
    ).sort((a, b) => (sortBy(a) - sortBy(b)) * (state.descending ? -1 : 1) || a.player.localeCompare(b.player));
  }

  function renderSummary() {
    const m = state.snapshot.meta;
    $("#labLoad").hidden = true;
    $("#labSummary").hidden = false;
    $("#labSummary").innerHTML = [
      [m.players, "RESEARCH PLAYERS"], [m.weekly_rows.toLocaleString("en-US"), "SCHEDULED PLAYER-GAMES"],
      ["W9", "DATA CUTOFF"], ["$0", "ADDITIONAL DATA / COMPUTE"]
    ].map(([value, label]) => `<article><strong>${safe(value)}</strong><small>${safe(label)}</small></article>`).join("");
  }

  function renderForecasts() {
    if (!state.snapshot) return;
    const filtered = forecastPlayers();
    $("#forecastCount").textContent = `${filtered.length} PLAYERS`;
    $("#forecastRows").innerHTML = filtered.slice(0, state.visible).map(p => {
      const next = p.next_game;
      const opponent = `${next.home_away === "home" ? "vs" : "@"} ${next.opponent}`;
      return `<tr>
        <td><button class="lab-player-link" data-lab-card="${safe(p.id)}"><span class="position-mark ${safe(p.position)}">${safe(p.position)}</span><span><strong>${safe(p.player)}</strong><small>${safe(p.team)}</small></span></button></td>
        <td class="lab-opponent">W${next.week} ${safe(opponent)}</td>
        <td class="lab-primary">${formatted(next.fantasy_points)}</td>
        <td>${formatted(p.next_four.fantasy_points)}</td>
        <td>${formatted(p.rest_of_season.fantasy_points)}</td>
        <td class="${gapClass(p.gap)}">${signed(p.gap)}</td>
        <td><button class="lab-open" data-lab-card="${safe(p.id)}">DETAILS ↗</button></td>
      </tr>`;
    }).join("") || '<tr><td colspan="7" class="table-loading">No players match this filter.</td></tr>';
    $("#labMore").hidden = filtered.length <= state.visible;
    document.querySelectorAll("[data-forecast-sort]").forEach(button =>
      button.classList.toggle("current", button.dataset.forecastSort === state.sort));
  }

  function signalRow(p) {
    const opportunity = p.opportunity || {};
    const unit = { targets: "targets", passes: "attempts", carries: "carries" }[opportunity.metric] || opportunity.metric;
    return `<button class="lab-signal-row" data-lab-card="${safe(p.id)}">
      <span><strong>${safe(p.player)}</strong><small>${safe(p.position)} · ${safe(p.team)} · ${formatted(opportunity.recent_six_per_appearance)} ${safe(unit)} / appearance</small></span>
      <span class="${gapClass(p.gap)}">${signed(p.gap)}<small>${formatted(p.recent_ppg)} → ${formatted(p.next_game.fantasy_points)}</small></span>
    </button>`;
  }

  function renderValue() {
    if (!state.snapshot) return;
    const search = state.valueSearch.toLowerCase();
    const rows = state.snapshot.players.filter(p =>
      (state.valuePos === "ALL" || p.position === state.valuePos) &&
      `${p.player} ${p.position} ${p.team}`.toLowerCase().includes(search)
    );
    const positive = rows.filter(p => p.gap > .05).sort((a, b) => b.gap - a.gap).slice(0, 18);
    const negative = rows.filter(p => p.gap < -.05).sort((a, b) => a.gap - b.gap).slice(0, 18);
    $("#valuePositive").innerHTML = positive.map(signalRow).join("") || '<div class="lab-no-signal">No positive gaps in this selection.</div>';
    $("#valueNegative").innerHTML = negative.map(signalRow).join("") || '<div class="lab-no-signal">No negative gaps in this selection.</div>';
  }

  function renderMetrics() {
    if (!state.snapshot) return;
    const pos = $("#metricPos").value;
    // Sparse QB passing and interception cells for RBs/WRs/TEs can show
    // misleading 100% gains when the baseline error is effectively zero.
    const relevant = {
      QB: ["passing_yards", "passing_tds", "interceptions", "rushing_yards", "rushing_tds"],
      RB: ["rushing_yards", "rushing_tds", "catches", "receiving_yards", "receiving_tds"],
      WR: ["catches", "receiving_yards", "receiving_tds", "rushing_yards"],
      TE: ["catches", "receiving_yards", "receiving_tds"],
    };
    const rows = state.snapshot.metrics.feature_ablation.filter(p =>
      p.position === pos && relevant[pos].includes(p.metric))
      .sort((a, b) => Number(b.added_features_delta_pp) - Number(a.added_features_delta_pp));
    $("#labMetricRows").innerHTML = rows.map(row => {
      const delta = Number(row.added_features_delta_pp);
      return `<tr><td class="lab-metric-name">${safe(row.metric.replaceAll("_", " "))}</td>
        <td>${signed(row.basic)}%</td><td>${signed(row.full)}%</td>
        <td class="${gapClass(delta)}">${signed(delta)} pp</td></tr>`;
    }).join("");
  }

  function statRows(stats, position) {
    const labels = { passing_yards: "Pass yards", passing_tds: "Pass TDs", interceptions: "Interceptions",
      rushing_yards: "Rush yards", rushing_tds: "Rush TDs", receiving_yards: "Rec yards",
      receiving_tds: "Rec TDs", catches: "Receptions" };
    const order = position === "QB"
      ? ["passing_yards", "passing_tds", "interceptions", "rushing_yards", "rushing_tds", "catches", "receiving_yards", "receiving_tds"]
      : ["catches", "receiving_yards", "receiving_tds", "rushing_yards", "rushing_tds", "passing_yards", "passing_tds", "interceptions"];
    return order.filter(k => Math.abs(Number(stats[k] || 0)) >= .004)
      .map(key => `<div><span>${labels[key]}</span><strong>${formatted(stats[key], key.includes("tds") || key === "interceptions" ? 2 : 1)}</strong></div>`).join("");
  }

  function horizonCard(title, info, p, subtitle) {
    return `<div class="lab-horizon-card"><div class="lab-horizon-heading"><span>${safe(title)}</span><small>${safe(subtitle)}</small></div>
      <strong class="lab-horizon-total">${formatted(info.fantasy_points, 2)} <small>PTS</small></strong>
      <div class="lab-stat-grid">${statRows(info.stats, p.position)}</div></div>`;
  }

  function renderCard(p) {
    const weeks = p.weekly.map(row => `<tr><td>W${row.week}</td><td>${row.home_away === "home" ? "vs" : "@"} ${safe(row.opponent)}</td><td>${formatted(row.fantasy_points, 2)}</td></tr>`).join("");
    const recent = p.production_vs_underlying_ability;
    const unc = p.uncertainty;
    $("#labDrawerContent").innerHTML = `<div class="drawer-body">
      <div class="drawer-identity"><span class="position-mark ${safe(p.position)}">${safe(p.position)}</span><div><div class="drawer-name">${safe(p.player)}</div>
      <div class="drawer-description">${safe(p.team)} · ${safe(p.position)} · W${p.next_game.week} ${p.next_game.home_away === "home" ? "vs" : "@"} ${safe(p.next_game.opponent)}</div></div></div>
      <div class="lab-card-warning">WEEK 9 CUTOFF · PLAYING ASSUMED · RESEARCH PREVIEW</div>
      ${horizonCard("NEXT GAME", p.next_game, p, `Week ${p.next_game.week} forecast`)}
      ${horizonCard("NEXT 4 GAMES", p.next_four, p, `${p.next_four.weeks.length} scheduled games`)}
      ${horizonCard("REST OF SEASON", p.rest_of_season, p, `${p.rest_of_season.games} scheduled games`)}
      <div class="drawer-section"><h3>Production versus expectation</h3>
        <div class="drawer-feature"><span>Last six appearances · PPG</span><strong>${formatted(recent.recent_six_fp_per_appearance, 2)}</strong></div>
        <div class="drawer-feature"><span>Modeled next-game points</span><strong>${formatted(recent.expected_next_game_fp, 2)}</strong></div>
        <div class="drawer-feature"><span>Forecast minus recent PPG</span><strong class="${gapClass(p.gap)}">${signed(p.gap)}</strong></div>
        <div class="drawer-feature"><span>Recent opportunity</span><strong>${formatted(p.opportunity.recent_six_per_appearance)} ${safe(p.opportunity.metric)}/appearance</strong></div>
        <p>${safe(recent.note)}. Market price, injuries, current snap role and a causal talent rating are not measured.</p></div>
      <div class="drawer-section"><h3>Scheduled weekly allocation</h3><div class="table-scroller"><table class="lab-schedule"><thead><tr><th>WEEK</th><th>OPPONENT</th><th>FP</th></tr></thead><tbody>${weeks}</tbody></table></div>
        <p>The first game uses the dedicated/baseline next-game forecast. Games 2–4 share the remaining four-game forecast; the ROS tail shares the remaining season forecast equally. No opponent-specific adjustments are included.</p></div>
      <div class="drawer-section"><h3>Historical error reference</h3>
        <div class="drawer-feature"><span>Next game · 2025 abs-error p80</span><strong>± ${formatted(unc.next_game_empirical_2025_p80_abs_error)} pts</strong></div>
        <div class="drawer-feature"><span>Next game · 2025 abs-error p90</span><strong>± ${formatted(unc.next_game_empirical_2025_p90_abs_error)} pts</strong></div>
        <div class="drawer-feature"><span>ROS · 2025 abs-error p80</span><strong>± ${formatted(unc.ros_empirical_2025_p80_abs_error)} pts</strong></div>
        <div class="drawer-feature"><span>ROS · 2025 abs-error p90</span><strong>± ${formatted(unc.ros_empirical_2025_p90_abs_error)} pts</strong></div>
        <p>Historical error percentiles only. These are <strong>not validated individual prediction intervals</strong>; there is no calibrated four-game error band in this release.</p></div>
      <div class="drawer-section"><h3>Player-level explanation</h3><p>${safe(p.explanation)}</p>
        <p>Next game: ${safe(p.method.next_game)} · ROS: ${safe(p.method.ros)}. The model estimates box-score statistics before applying your league's fantasy scoring.</p></div>
    </div>`;
  }

  function openCard(id) {
    const p = state.snapshot?.players.find(row => row.id === id);
    if (!p) return;
    state.drawer = id;
    renderCard(p);
    $("#labDrawerBackdrop").hidden = false;
    $("#labDrawer").hidden = false;
    document.body.style.overflow = "hidden";
    $("#labDrawerClose").focus();
  }

  function closeCard() {
    $("#labDrawerBackdrop").hidden = true;
    $("#labDrawer").hidden = true;
    state.drawer = null;
    document.body.style.overflow = "";
  }

  function exportCsv() {
    if (!state.snapshot) return;
    const fields = ["name", "position", "team", "next_game_week", "opponent", "next_game_fp",
      "next_four_fp", "ros_fp", "ros_games", "recent_ppg", "model_minus_recent_ppg"];
    const data = forecastPlayers().map(p => [p.player, p.position, p.team, p.next_game.week, p.next_game.opponent,
      p.next_game.fantasy_points, p.next_four.fantasy_points, p.rest_of_season.fantasy_points,
      p.rest_of_season.games, p.recent_ppg, p.gap]);
    const encode = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const lines = [fields.join(","), ...data.map(row => row.map(encode).join(","))];
    const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sideline-iq-research-v1-week9-2026.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 200);
  }

  function bind() {
    $("#forecastSearch").addEventListener("input", e => { state.forecastSearch = e.target.value; state.visible = 45; renderForecasts(); });
    $("#forecastPos").addEventListener("change", e => { state.forecastPos = e.target.value; state.visible = 45; renderForecasts(); });
    $("#valueSearch").addEventListener("input", e => { state.valueSearch = e.target.value; renderValue(); });
    $("#valuePos").addEventListener("change", e => { state.valuePos = e.target.value; renderValue(); });
    $("#metricPos").addEventListener("change", renderMetrics);
    $("#labMore").addEventListener("click", () => { state.visible += 45; renderForecasts(); });
    $("#labCsv").addEventListener("click", exportCsv);
    document.querySelectorAll("[data-forecast-sort]").forEach(button => button.addEventListener("click", () => {
      const key = button.dataset.forecastSort;
      state.descending = state.sort === key ? !state.descending : true;
      state.sort = key;
      renderForecasts();
    }));
    ["#view-forecasts", "#view-value"].forEach(selector => $(selector).addEventListener("click", e => {
      const target = e.target.closest("[data-lab-card]");
      if (target) openCard(target.dataset.labCard);
    }));
    $("#labDrawerClose").addEventListener("click", closeCard);
    $("#labDrawerBackdrop").addEventListener("click", closeCard);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && state.drawer) closeCard(); });
  }

  window.SidelineResearch = { onView(view) { state.active = view; if (view === "forecasts") renderForecasts(); else if (view === "value") { renderValue(); renderMetrics(); } } };

  async function start() {
    bind();
    try {
      const response = await fetch("./data/research-v1.json", { cache: "no-store" });
      if (!response.ok) throw Error(`Research data HTTP ${response.status}`);
      const snapshot = await response.json();
      if (snapshot.meta.players !== 251 || snapshot.players.length !== 251 || snapshot.meta.last_observed_week !== 9) {
        throw Error("Research snapshot failed player-count or cutoff check");
      }
      state.snapshot = snapshot;
      renderSummary();
      renderForecasts();
      renderValue();
      renderMetrics();
    } catch (error) {
      $("#labLoad").textContent = "Research snapshot could not be loaded. The original dashboard is still available.";
      $("#labLoad").classList.add("lab-error");
      console.error("Research snapshot:", error);
    }
  }

  start();
})();
