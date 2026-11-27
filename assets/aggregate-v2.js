/* Explicit aggregation rules; unknown and NGS rate metrics are never summed. */
(function(root){
'use strict';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const sums=['attempts','completions','passing_yards','passing_tds','passing_interceptions','interceptions','sacks','sack_yards','passing_air_yards','passing_yards_after_catch','passing_first_downs','passing_epa','carries','rushing_yards','rushing_tds','rushing_first_downs','rushing_epa','targets','receptions','receiving_yards','receiving_tds','receiving_air_yards','receiving_yards_after_catch','receiving_first_downs','receiving_epa','fantasy_points','fantasy_points_ppr'];
const ratios={completion_pct:['completions','attempts',100],yards_per_attempt:['passing_yards','attempts',1],yards_per_carry:['rushing_yards','carries',1],yards_per_target:['receiving_yards','targets',1],catch_pct:['receptions','targets',100],yards_per_reception:['receiving_yards','receptions',1]};
function aggregate(rows){
 const groups=new Map();
 for(const r of rows){const k=r.season+'|'+r.player_id;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r)}
 return [...groups.values()].map(g=>{
 const latest=g.reduce((a,b)=>a.week>b.week?a:b),out={player_id:latest.player_id,player_display_name:latest.player_display_name||latest.player_name||latest.player_id,position:latest.position,season:latest.season,team:latest.team||latest.recent_team||null,week:latest.week,observed_weeks:g.length};
 for(const k of sums){const vals=g.map(r=>r[k]);out[k]=vals.every(finite)?vals.reduce((a,b)=>a+b,0):null}
 for(const [k,[n,d,m]] of Object.entries(ratios)){out[k]=finite(out[n])&&finite(out[d])&&out[d]>0?out[n]/out[d]*m:null}
 return out;
 });
}
const api={aggregate,sums,ratios};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SidelineAggregate=api;
})(typeof globalThis!=='undefined'?globalThis:this);
