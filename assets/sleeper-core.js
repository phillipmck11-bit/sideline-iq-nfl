/* Pure Sleeper roster mapping and optimal-lineup math. No API calls or runtime dependencies. */
((root, factory) => {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.SidelineSleeperCore = api;
})(typeof window !== "undefined" ? window : globalThis, () => {
  "use strict";

  const POSITION_SLOTS = {
    QB: ["QB"], RB: ["RB"], WR: ["WR"], TE: ["TE"],
    FLEX: ["RB", "WR", "TE"], SUPER_FLEX: ["QB", "RB", "WR", "TE"],
    WRRB_FLEX: ["RB", "WR"], REC_FLEX: ["WR", "TE"],
  };
  const BENCH_SLOTS = new Set(["BN", "IR", "TAXI", "RESERVE"]);

  function normalizedName(name) {
    return String(name ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\b/g, "").replace(/[^a-z0-9]/g, "");
  }

  function supportedStarters(rosterPositions) {
    return (rosterPositions || []).filter(slot => Object.hasOwn(POSITION_SLOTS, slot));
  }

  function unsupportedStarters(rosterPositions) {
    return (rosterPositions || []).filter(slot => !POSITION_SLOTS[slot] && !BENCH_SLOTS.has(slot));
  }

  function modelLookup(researchPlayers) {
    const gsis = new Map(), name = new Map();
    for (const player of researchPlayers || []) {
      gsis.set(String(player.player_id || player.id), player);
      const key = `${normalizedName(player.player)}|${player.position}`;
      if (!name.has(key)) name.set(key, []);
      name.get(key).push(player);
    }
    return { gsis, name };
  }

  function findResearchPlayer(sleeperPlayer, lookup) {
    if (!sleeperPlayer) return null;
    const gsis = String(sleeperPlayer.gsis_id || sleeperPlayer.stats_id || "");
    if (gsis && lookup.gsis.has(gsis)) return lookup.gsis.get(gsis);
    const candidates = lookup.name.get(`${normalizedName(sleeperPlayer.full_name ||
      [sleeperPlayer.first_name, sleeperPlayer.last_name].filter(Boolean).join(" "))}|${sleeperPlayer.position}`) || [];
    if (candidates.length === 1) return candidates[0];
    // Only use a team fallback when duplicate player names exist.
    const equivalent = t => ({ JAX: "JAC", LA: "LAR", WSH: "WAS" }[t] || t || "");
    return candidates.find(candidate => equivalent(candidate.team) === equivalent(sleeperPlayer.team)) || null;
  }

  function pointsForWeek(model, week) {
    if (!model) return null; // no coverage is different from a projected BYE.
    const entry = (model.weekly || []).find(item => +item.week === +week);
    return entry ? +entry.fantasy_points : 0;
  }

  function bestLineup(candidates, rosterPositions, week) {
    const slots = supportedStarters(rosterPositions);
    if (slots.length > 14) throw new Error("More than 14 modeled starting slots are not supported");
    const initial = { value: 0, modeled: 0, assigned: [] };
    let states = new Map([[0, initial]]);
    const drafted = (candidates || []).filter(candidate => candidate && candidate.position && candidate.id);
    const scoreFor = candidate => Math.max(0, pointsForWeek(candidate.model, week) ?? 0);
    for (const candidate of drafted) {
      const next = new Map(states);
      const eligibleSlots = slots.map((slot, index) => POSITION_SLOTS[slot].includes(candidate.position) ? index : -1)
        .filter(index => index >= 0);
      if (!eligibleSlots.length) continue;
      for (const [mask, state] of states.entries()) {
        for (const index of eligibleSlots) {
          const flag = 1 << index;
          if (mask & flag) continue;
          const newMask = mask | flag;
          const value = state.value + scoreFor(candidate);
          const modeled = state.modeled + (candidate.model ? 1 : 0);
          const old = next.get(newMask);
          if (!old || value > old.value + 1e-9 || (Math.abs(value - old.value) < 1e-9 && modeled > old.modeled)) {
            next.set(newMask, { value, modeled, assigned: [...state.assigned, { index, candidate }] });
          }
        }
      }
      states = next;
    }
    const popcount = value => { let count = 0; while (value) { value &= value - 1; count++; } return count; };
    let winningMask = 0, best = initial;
    for (const [mask, state] of states.entries()) {
      const filled = popcount(mask), previousFilled = popcount(winningMask);
      if (filled > previousFilled || (filled === previousFilled &&
          (state.value > best.value + 1e-9 || (Math.abs(state.value - best.value) < 1e-9 && state.modeled > best.modeled)))) {
        winningMask = mask;
        best = state;
      }
    }
    const lineup = slots.map((slot, index) => {
      const found = best.assigned.find(pair => pair.index === index);
      const candidate = found?.candidate || null;
      return { slot, id: candidate?.id || null, name: candidate?.name || "OPEN SLOT",
        position: candidate?.position || null, modeled: Boolean(candidate?.model),
        projection: candidate ? pointsForWeek(candidate.model, week) : null,
        team: candidate?.team || "" };
    });
    return { total: best.value, modeled: best.modeled, filled: popcount(winningMask),
      slots: slots.length, lineup, week, unsupported: unsupportedStarters(rosterPositions) };
  }

  function projectHorizon(candidates, rosterPositions, weeks) {
    const lineups = weeks.map(week => bestLineup(candidates, rosterPositions, week));
    return { total: lineups.reduce((sum, item) => sum + item.total, 0),
      modeled: lineups.reduce((sum, item) => sum + item.modeled, 0),
      slots: lineups.reduce((sum, item) => sum + item.slots, 0),
      lineups, weeks: [...weeks] };
  }

  return { normalizedName, supportedStarters, unsupportedStarters, modelLookup,
    findResearchPlayer, pointsForWeek, bestLineup, projectHorizon };
});
