"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../assets/sleeper-core.js");

function candidate(id, name, position, points, otherWeek = points) {
  return { id, name, position, team: "TEST",
    model: { weekly: [{ week: 10, fantasy_points: points }, { week: 11, fantasy_points: otherWeek }] } };
}

test("Superflex and flex lineup maximizes points without double-using players", () => {
  const positions = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX", "SUPER_FLEX", "BN", "IR", "TAXI"];
  const players = [
    candidate("qb1", "QB One", "QB", 25), candidate("qb2", "QB Two", "QB", 22),
    candidate("rb1", "RB One", "RB", 20), candidate("rb2", "RB Two", "RB", 17),
    candidate("rb3", "RB Three", "RB", 12),
    candidate("wr1", "WR One", "WR", 21), candidate("wr2", "WR Two", "WR", 19),
    candidate("wr3", "WR Three", "WR", 14), candidate("wr4", "WR Four", "WR", 11),
    candidate("te1", "TE One", "TE", 18), candidate("te2", "TE Two", "TE", 6),
  ];
  const optimized = core.bestLineup(players, positions, 10);
  assert.equal(optimized.slots, 9);
  assert.equal(optimized.filled, 9);
  assert.equal(optimized.lineup.filter(p => p.slot === "SUPER_FLEX")[0].id, "qb2");
  assert.equal(optimized.modeled, 9);
  assert.equal(new Set(optimized.lineup.map(p => p.id)).size, 9);
  assert.equal(optimized.total, 25 + 22 + 20 + 17 + 12 + 21 + 19 + 14 + 18);
});

test("Bye is a projected zero while absent model is missing coverage", () => {
  assert.equal(core.pointsForWeek({ weekly: [{ week: 11, fantasy_points: 8.5 }] }, 10), 0);
  assert.equal(core.pointsForWeek(null, 10), null);
  const result = core.bestLineup([
    candidate("q", "QB", "QB", 25),
    { id: "rb", name: "Unmodeled RB", position: "RB", model: null }
  ], ["QB", "RB"], 10);
  assert.equal(result.total, 25);
  assert.equal(result.modeled, 1);
  assert.equal(result.filled, 2);
  assert.equal(result.lineup[1].projection, null);
});

test("Position eligibility honors TE premium flex and does not create imaginary players", () => {
  const p = [candidate("t1", "TE One", "TE", 17), candidate("wr1", "WR One", "WR", 9),
    candidate("rb1", "RB One", "RB", 12)];
  const result = core.bestLineup(p, ["QB", "TE", "FLEX"], 10);
  assert.equal(result.filled, 2);
  assert.equal(result.lineup[0].name, "OPEN SLOT");
  assert.equal(result.lineup[1].name, "TE One");
  assert.equal(result.lineup[2].name, "RB One");
  assert.deepEqual(core.unsupportedStarters(["QB", "K", "DEF", "BN"]), ["K", "DEF"]);
});

test("Research player matching prefers GSIS then normalized name fallback", () => {
  const research = [{ player_id: "00-123", player: "Puka Nacua", position: "WR", team: "LAR", weekly: [] },
    { player_id: "00-456", player: "Mike Washington Jr.", position: "RB", team: "LV", weekly: [] }];
  const lookup = core.modelLookup(research);
  assert.equal(core.findResearchPlayer({ gsis_id: "00-123", full_name: "Different Name", position: "WR" }, lookup).player, "Puka Nacua");
  assert.equal(core.findResearchPlayer({ full_name: "Mike Washington", position: "RB", team: "LV" }, lookup).player, "Mike Washington Jr.");
  assert.equal(core.findResearchPlayer({ full_name: "Unknown Person", position: "WR" }, lookup), null);
});

test("Four-week totals re-optimize after weekly player performance changes", () => {
  const p = [candidate("rb1", "First", "RB", 15, 2), candidate("rb2", "Second", "RB", 4, 21)];
  const result = core.projectHorizon(p, ["RB"], [10, 11]);
  assert.equal(result.total, 36);
  assert.equal(result.lineups[0].lineup[0].id, "rb1");
  assert.equal(result.lineups[1].lineup[0].id, "rb2");
});
