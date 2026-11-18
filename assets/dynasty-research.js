"use strict";
const DATA={};let currentRows=[],currentColumns=[];
const $=id=>document.getElementById(id);
const n=x=>{const v=Number(x);return Number.isFinite(v)?v:0};
const fmt=(x,d=1)=>Number.isFinite(Number(x))?Number(x).toFixed(d):"—";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function parseCSV(s){
 const out=[];let row=[],cell="",quoted=false;
 for(let i=0;i<s.length;i++){const c=s[i];
  if(c==='"'){if(quoted&&s[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
  else if(c===','&&!quoted){row.push(cell);cell=""}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&s[i+1]==='\n')i++;row.push(cell);cell="";if(row.some(v=>v!==""))out.push(row);row=[]}
  else cell+=c;
 }
 if(cell!==""||row.length){row.push(cell);out.push(row)}
 const headers=out.shift()||[];return out.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??""])));
}
function table(id,rows,columns,labels={}){
 if(!$(id).closest(".research-panel").hidden){currentRows=rows;currentColumns=columns;}
 const head=columns.map(c=>'<th>'+esc(labels[c]||c.replaceAll("_"," "))+'</th>').join("");
 const body=rows.slice(0,500).map(r=>'<tr '+(r.player_id?'data-player="'+esc(r.player_id)+'"':'')+'>'+columns.map(c=>'<td>'+esc(r[c])+'</td>').join("")+'</tr>').join("");
 $(id).innerHTML='<table><thead><tr>'+head+'</tr></thead><tbody>'+body+'</tbody></table><p>'+rows.length+' rows'+(rows.length>500?' · first 500 displayed':'')+'</p>';
}
function filtered(rows,name="player_display_name"){
 const pos=$("position").value,term=$("search").value.toLowerCase().trim();
 return rows.filter(r=>(pos==="ALL"||r.position===pos)&&(!term||String(r[name]||"").toLowerCase().includes(term)));
}
function forecasts(){
 const horizon=n($("horizon").value);
 const rows=filtered(DATA.calendar_forecasts_2026).filter(r=>n(r.horizon_calendar_weeks)===horizon)
 .map(r=>({...r,projected_horizon_fp:fmt(n(r.forecast_fantasy_per_calendar_week)*horizon),
 fp_week:fmt(r.forecast_fantasy_per_calendar_week),targets_week:fmt(r.forecast_targets_per_calendar_week),
 carries_week:fmt(r.forecast_carries_per_calendar_week),attempts_week:fmt(r.forecast_attempts_per_calendar_week),
 pass_yards_week:fmt(r.forecast_passing_yards_per_calendar_week),rush_yards_week:fmt(r.forecast_rushing_yards_per_calendar_week),
 rec_yards_week:fmt(r.forecast_receiving_yards_per_calendar_week),error_p80:fmt(r.historical_absolute_error_p80)}))
 .sort((a,b)=>n(b.projected_horizon_fp)-n(a.projected_horizon_fp));
 $("forecastMetrics").innerHTML='<div class="research-metric"><small>PLAYERS</small><strong>'+rows.length+'</strong></div>'+
 '<div class="research-metric"><small>FORECAST HORIZON</small><strong>'+horizon+' wk</strong></div>'+
 '<div class="research-metric"><small>LATEST SNAPSHOT</small><strong>WK 9</strong></div>';
 table("forecastTable",rows,["player_display_name","position","team","last_observed_week","projected_horizon_fp","fp_week","targets_week","carries_week","attempts_week","pass_yards_week","rush_yards_week","rec_yards_week","error_p80"],
 {player_display_name:"Player",last_observed_week:"Last observed week",projected_horizon_fp:"Horizon FP",fp_week:"FP / week",
 targets_week:"Targets / wk",carries_week:"Carries / wk",attempts_week:"Pass att / wk",pass_yards_week:"Pass yd / wk",
 rush_yards_week:"Rush yd / wk",rec_yards_week:"Rec yd / wk",error_p80:"Historical error P80"});
}
function cards(){
 const rows=filtered(DATA.player_cards_2026,"player");const sel=$("cardPlayer"),prev=sel.value;
 sel.innerHTML=rows.sort((a,b)=>a.player.localeCompare(b.player)).map(r=>'<option value="'+esc(r.player_id)+'">'+esc(r.player+' · '+r.position)+'</option>').join("");
 if(rows.some(r=>r.player_id===prev))sel.value=prev;
 showCard();
}
function showCard(){
 const r=DATA.player_cards_2026.find(x=>x.player_id===$("cardPlayer").value);if(!r){$("cardDetails").innerHTML="No matching player.";return}
 const f=DATA.calendar_forecasts_2026.find(x=>x.player_id===r.player_id&&n(x.horizon_calendar_weeks)===n($("horizon").value));
 const keys=["attempts","carries","targets","receptions","passing_yards","rushing_yards","receiving_yards","passing_tds","passing_interceptions","rushing_tds","receiving_tds"];
 $("cardDetails").innerHTML='<div class="research-metrics"><div class="research-metric"><small>PLAYER</small><strong>'+esc(r.player)+'</strong></div>'+
 '<div class="research-metric"><small>FOUR APPEARANCES FP</small><strong>'+fmt(r.forecast_4_appearance_fantasy)+'</strong></div>'+
 '<div class="research-metric"><small>CALENDAR FP / WEEK</small><strong>'+(f?fmt(f.forecast_fantasy_per_calendar_week):"—")+'</strong></div></div>'+
 '<div class="research-table"><table><thead><tr><th>Projected stat per appearance</th><th>Value</th></tr></thead><tbody>'+
 keys.map(k=>'<tr><td>'+esc(k.replaceAll("_"," "))+'</td><td>'+fmt(r[k])+'</td></tr>').join("")+'</tbody></table></div>';
}
function opportunity(){
 const rows=DATA.signal_diagnostics.filter(r=>$("position").value==="ALL"||r.position===$("position").value)
 .sort((a,b)=>a.position.localeCompare(b.position)||n(b.spearman_future4_fantasy)-n(a.spearman_future4_fantasy))
 .map(r=>({...r,spearman_future4_fantasy:fmt(r.spearman_future4_fantasy,3)}));
 table("opportunityTable",rows,["position","feature","n","spearman_future4_fantasy"],{feature:"Historical predictor",n:"Observations",spearman_future4_fantasy:"Spearman correlation"});
}
function breakout(){
 const rows=DATA.wr_breakout_2026.filter(r=>r.checkpoint===$("checkpoint").value&&r.outcome===$("outcome").value)
 .filter(r=>!$("search").value||r.player_name.toLowerCase().includes($("search").value.toLowerCase()))
 .sort((a,b)=>n(a.rank)-n(b.rank)).map(r=>({...r,uncalibrated_model_score:fmt(r.uncalibrated_model_score,3),
 targets_per_week_to_checkpoint:fmt(r.targets_per_week_to_checkpoint),yards_per_week_to_checkpoint:fmt(r.yards_per_week_to_checkpoint),
 ngs_separation_last4:r.ngs_separation_last4?fmt(r.ngs_separation_last4,2):"—"}));
 table("breakoutTable",rows,["rank","player_name","age_at_season_start","experience","draft_pick","uncalibrated_model_score",
 "targets_per_week_to_checkpoint","yards_per_week_to_checkpoint","ngs_separation_last4"],
 {player_name:"Player",age_at_season_start:"Age",draft_pick:"Draft pick",uncalibrated_model_score:"Research score",targets_per_week_to_checkpoint:"Targets / wk",yards_per_week_to_checkpoint:"Yards / wk",ngs_separation_last4:"Separation"});
}
function validation(){
 const rows=DATA.model_selection.filter(r=>($("position").value==="ALL"||r.position===$("position").value)&&r.horizon_calendar_weeks===$("horizon").value);
 table("validationTable",rows,["position","metric","model","years_improved","mean_baseline_mae","mean_model_mae"],
 {metric:"Projected statistic",model:"Selected model",years_improved:"Years improved",mean_baseline_mae:"Baseline MAE",mean_model_mae:"Stat model MAE"});
}
function refresh(){forecasts();cards();opportunity();breakout();validation()}
function exportCSV(){
 const cols=currentColumns,rows=currentRows;
 const q=v=>'"'+String(v??"").replaceAll('"','""')+'"';
 const csv=[cols.map(q).join(","),...rows.map(r=>cols.map(c=>q(r[c])).join(","))].join("\r\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="sideline-iq-research.csv";a.click();URL.revokeObjectURL(url);
}
async function init(){
 try{
 const names=["calendar_forecasts_2026","player_cards_2026","wr_breakout_2026","model_selection","signal_diagnostics"];
 await Promise.all(names.map(async name=>{
  const r=await fetch("./data/"+name+".csv");if(!r.ok)throw Error(name+" HTTP "+r.status);
  DATA[name]=parseCSV(await r.text());
  if (!DATA[name].length) throw Error(name+" has no parsed player/research rows");
 }));
 const checkpoints=[...new Set(DATA.wr_breakout_2026.map(r=>r.checkpoint))].sort((a,b)=>n(a)-n(b));
 $("checkpoint").innerHTML=checkpoints.map(x=>'<option value="'+esc(x)+'">Week '+esc(x)+'</option>').join("");
 $("checkpoint").value=checkpoints[checkpoints.length-1];
 $("outcome").innerHTML=[...new Set(DATA.wr_breakout_2026.map(r=>r.outcome))].map(x=>'<option value="'+esc(x)+'">'+esc(x.replaceAll("_"," "))+'</option>').join("");
 ["position","search","horizon","checkpoint","outcome"].forEach(id=>$(id).addEventListener(id==="search"?"input":"change",refresh));
 $("cardPlayer").addEventListener("change",showCard);
 $("export").addEventListener("click",exportCSV);
 document.querySelectorAll("[data-tab]").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b===btn));
  document.querySelectorAll("[id^=panel-]").forEach(p=>p.hidden=p.id!=="panel-"+btn.dataset.tab);
  refresh();
 }));
 refresh();
  document.querySelector(".research-pill").textContent="RESEARCH LOADED · 2026 HISTORICAL";
 }catch(e){document.querySelector(".research-shell").insertAdjacentHTML("afterbegin",'<div class="research-note">Unable to load research data: '+esc(e.message)+'</div>');}
}
init();
