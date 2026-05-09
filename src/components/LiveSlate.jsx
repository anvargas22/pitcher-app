import { useState, useCallback } from "react";
import { fetchProbablePitchers, buildPitcherRow, calcLockScore, calcKHitRate } from "../services/mlbApi";
import { gradeK, gradeOpp, combinedKGrade, gradeScore, GRADE_COLORS, gradeBB, gradeOuts } from "../utils/grades";
import { Pill, Dot, PCBadge } from "./Pill";

const STATUS_COLORS = {
  idle:    { bg:"#0f172a", border:"#334155" },
  loading: { bg:"#0f1f3d", border:"#1d4ed8" },
  done:    { bg:"#061a0a", border:"#16a34a" },
  error:   { bg:"#1a0505", border:"#dc2626" },
};

function LockScoreBadge({ score, grade }) {
  const col = grade.includes("🔒🔒") ? "#22c55e"
    : grade.includes("🔒") ? "#4ade80"
    : grade.includes("⚠️") ? "#eab308"
    : "#ef4444";
  const bg = grade.includes("🔒🔒") ? "#061a0a"
    : grade.includes("🔒") ? "#0a1f0a"
    : grade.includes("⚠️") ? "#1a1400"
    : "#1a0505";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
      <div style={{ background:bg, border:`1px solid ${col}`, borderRadius:6, padding:"3px 8px", color:col, fontSize:9, fontWeight:700, whiteSpace:"nowrap" }}>
        {grade}
      </div>
      <div style={{ color:"#475569", fontSize:8 }}>{score}/7 signals</div>
    </div>
  );
}

function KLinePanel({ r, kLine, onKLineChange }) {
  const hitRate = calcKHitRate(r.kArr, kLine);
  const lockInfo = calcLockScore(r, kLine);
  const hitCol = hitRate >= 67 ? "#22c55e" : hitRate >= 40 ? "#eab308" : "#ef4444";

  return (
    <div style={{ background:"#0d1117", border:"1px solid #1e293b", borderRadius:10, padding:"10px 12px" }}>
      <div style={{ color:"#475569", fontSize:9, letterSpacing:3, marginBottom:8 }}>K LINE ANALYSIS</div>

      {/* Expected K */}
      {r.expectedK && (
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ color:"#94a3b8", fontSize:10 }}>Expected Ks</span>
          <span style={{ color:"#a78bfa", fontWeight:700, fontSize:12 }}>~{r.expectedK}</span>
        </div>
      )}

      {/* Recent K avg */}
      {r.avgK !== null && (
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ color:"#94a3b8", fontSize:10 }}>Avg Ks/start</span>
          <span style={{ color:"#f1f5f9", fontWeight:700, fontSize:12 }}>{r.avgK} <span style={{ color:"#475569", fontSize:9 }}>({r.minK}–{r.maxK})</span></span>
        </div>
      )}

      {/* K line input */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <span style={{ color:"#94a3b8", fontSize:10 }}>PrizePicks line</span>
        <input
          type="number"
          step="0.5"
          min="0"
          max="15"
          value={kLine || ""}
          onChange={e => onKLineChange(parseFloat(e.target.value) || null)}
          placeholder="e.g. 4.5"
          style={{
            background:"#0f172a", border:"1px solid #334155", color:"#f1f5f9",
            borderRadius:5, padding:"3px 6px", width:60, fontSize:11,
            fontFamily:"monospace", outline:"none", textAlign:"center",
          }}
        />
      </div>

      {/* Hit rate */}
      {hitRate !== null && (
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ color:"#94a3b8", fontSize:10 }}>Hit rate vs {kLine}</span>
          <span style={{ color:hitCol, fontWeight:700, fontSize:12 }}>
            {hitRate}% ({r.kArr?.filter(k=>k>kLine).length}/{r.kArr?.length} starts)
          </span>
        </div>
      )}

      {/* Recent K log */}
      {r.kArr?.length > 0 && (
        <div style={{ marginTop:6 }}>
          <div style={{ color:"#475569", fontSize:8, letterSpacing:2, marginBottom:4 }}>RECENT K LOG</div>
          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
            {r.kArr.map((k, i) => (
              <span key={i} style={{
                background: kLine && k > kLine ? "#061a0a" : "#0f172a",
                border: `1px solid ${kLine && k > kLine ? "#16a34a" : "#1e293b"}`,
                color: kLine && k > kLine ? "#4ade80" : "#64748b",
                borderRadius:4, padding:"2px 6px", fontSize:10, fontWeight:700,
              }}>{k}K</span>
            ))}
          </div>
        </div>
      )}

      {/* Lock score breakdown */}
      <div style={{ marginTop:8, background:"#060c14", border:"1px solid #1e293b", borderRadius:6, padding:"6px 8px" }}>
        <div style={{ color:"#475569", fontSize:8, letterSpacing:2, marginBottom:4 }}>LOCK SCORE BREAKDOWN</div>
        {lockInfo.signals.map((s, i) => (
          <div key={i} style={{ color: s.startsWith("✅") ? "#4ade80" : s.startsWith("🔒") ? "#4ade80" : s.startsWith("⬜") ? "#475569" : "#f87171", fontSize:9, marginBottom:2 }}>
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

function PCStats({ r }) {
  if (!r.avgPC) return <span style={{color:"#475569",fontSize:9}}>No PC data</span>;
  const col = r.avgPC >= 90 ? "#22c55e" : r.avgPC >= 80 ? "#eab308" : "#ef4444";
  return (
    <div style={{display:"flex", flexDirection:"column", gap:3}}>
      <div style={{display:"flex", justifyContent:"space-between"}}>
        <span style={{color:"#94a3b8",fontSize:10}}>Avg PC</span>
        <span style={{color:col, fontWeight:700, fontSize:12}}>{r.avgPC}</span>
      </div>
      <div style={{display:"flex", justifyContent:"space-between"}}>
        <span style={{color:"#94a3b8",fontSize:10}}>Range</span>
        <span style={{color:"#f1f5f9",fontSize:10}}>{r.minPC}–{r.maxPC}</span>
      </div>
      <div style={{display:"flex", justifyContent:"space-between"}}>
        <span style={{color:"#94a3b8",fontSize:10}}>IP ceiling</span>
        <span style={{color:col, fontWeight:700, fontSize:10}}>~{r.ipCeiling} IP est.</span>
      </div>
      <div style={{display:"flex", justifyContent:"space-between"}}>
        <span style={{color:"#94a3b8",fontSize:10}}>Tendency</span>
        <PCBadge tendency={r.pcTendency}/>
      </div>
    </div>
  );
}

function WeatherBadge({ weather }) {
  if (!weather) return null;
  if (weather.isIndoor) return (
    <span style={{background:"#1e293b", color:"#475569", borderRadius:4, padding:"2px 7px", fontSize:9, fontWeight:700}}>
      🏟️ INDOOR
    </span>
  );
  return (
    <span style={{
      background: weather.alert ? "#1a0a00" : "#0f172a",
      color: weather.alert ? "#fbbf24" : "#64748b",
      border: `1px solid ${weather.alert ? "#92400e" : "#1e293b"}`,
      borderRadius:4, padding:"2px 7px", fontSize:9, fontWeight:700
    }}>
      {weather.summary}
    </span>
  );
}

function InjuryBadge({ injury }) {
  if (!injury) return null;
  const col = injury.severity === "high" ? "#dc2626" : "#eab308";
  return (
    <span style={{background:col, color:"#fff", borderRadius:4, padding:"2px 7px", fontSize:9, fontWeight:700}}>
      {injury.flag}
    </span>
  );
}


function KTrendBar({ kArr }) {
  if (!kArr?.length) return null;
  const max = Math.max(...kArr, 1);
  // Trend arrow
  const last3avg = kArr.slice(-3).reduce((a,b)=>a+b,0) / Math.min(kArr.length, 3);
  const first3avg = kArr.slice(0,3).reduce((a,b)=>a+b,0) / Math.min(kArr.length, 3);
  const trend = last3avg > first3avg + 0.5 ? "↗️ Rising"
    : last3avg < first3avg - 0.5 ? "↘️ Falling"
    : "→ Stable";
  const trendCol = trend.includes("↗️") ? "#22c55e" : trend.includes("↘️") ? "#ef4444" : "#94a3b8";

  return (
    <div style={{marginTop:8}}>
      <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
        <span style={{color:"#475569", fontSize:9, letterSpacing:2}}>K TREND (LAST {kArr.length} STARTS)</span>
        <span style={{color:trendCol, fontSize:9, fontWeight:700}}>{trend}</span>
      </div>
      <div style={{display:"flex", gap:4, alignItems:"flex-end", height:36}}>
        {kArr.map((k, i) => {
          const h = Math.max(Math.round((k/max)*32), 4);
          const isLast = i === kArr.length - 1;
          return (
            <div key={i} style={{display:"flex", flexDirection:"column", alignItems:"center", gap:2, flex:1}}>
              <span style={{color:"#f1f5f9", fontSize:8, fontWeight:700}}>{k}</span>
              <div style={{
                width:"100%", height:h,
                background: isLast ? "#3b82f6" : "#1e293b",
                border: `1px solid ${isLast ? "#60a5fa" : "#334155"}`,
                borderRadius:2,
              }}/>
            </div>
          );
        })}
      </div>
      <div style={{display:"flex", gap:8, marginTop:4}}>
        <span style={{color:"#475569", fontSize:8}}>High: {Math.max(...kArr)}K</span>
        <span style={{color:"#475569", fontSize:8}}>Low: {Math.min(...kArr)}K</span>
        <span style={{color:"#475569", fontSize:8}}>Avg: {(kArr.reduce((a,b)=>a+b,0)/kArr.length).toFixed(1)}K</span>
      </div>
    </div>
  );
}

function OppKSplitsPanel({ splits, oppK, oppKDays }) {
  if (!splits && !oppK) return (
    <div style={{color:"#475569", fontSize:9}}>Loading opp splits...</div>
  );

  const k7 = splits?.k7 ?? oppK;
  const k30 = splits?.k30;
  const handK = splits?.handK;
  const trend = splits?.trend ?? "→ Stable";
  const hand = splits?.pitcherHand;
  const trendCol = trend.includes("↗️") ? "#22c55e" : trend.includes("↘️") ? "#ef4444" : "#94a3b8";

  const gradeColor = (k) => {
    if (!k) return "#475569";
    return k >= 22 ? "#22c55e" : k >= 18 ? "#eab308" : "#ef4444";
  };

  return (
    <div>
      <div style={{display:"flex", justifyContent:"space-between", marginBottom:5}}>
        <span style={{color:"#94a3b8", fontSize:10}}>L7 K%</span>
        <span style={{color:gradeColor(k7), fontWeight:700, fontSize:11}}>{k7?.toFixed(1) ?? "—"}%</span>
      </div>
      {k30 && (
        <div style={{display:"flex", justifyContent:"space-between", marginBottom:5}}>
          <span style={{color:"#94a3b8", fontSize:10}}>L30 K%</span>
          <span style={{color:gradeColor(k30), fontWeight:700, fontSize:11}}>{k30.toFixed(1)}%</span>
        </div>
      )}
      {handK && (
        <div style={{display:"flex", justifyContent:"space-between", marginBottom:5}}>
          <span style={{color:"#94a3b8", fontSize:10}}>vs {hand === "L" ? "LHP" : "RHP"}</span>
          <span style={{color:gradeColor(handK), fontWeight:700, fontSize:11}}>{handK.toFixed(1)}%</span>
        </div>
      )}
      <div style={{display:"flex", justifyContent:"space-between", marginBottom:5}}>
        <span style={{color:"#94a3b8", fontSize:10}}>Trend</span>
        <span style={{color:trendCol, fontWeight:700, fontSize:10}}>{trend}</span>
      </div>
      {k7 && k30 && (
        <div style={{
          marginTop:4, padding:"3px 6px", borderRadius:4,
          background: k7 > k30 ? "#061a0a" : k7 < k30 - 2 ? "#1a0505" : "#0f172a",
          border: `1px solid ${k7 > k30 ? "#16a34a" : k7 < k30 - 2 ? "#dc2626" : "#334155"}`,
          color: k7 > k30 ? "#4ade80" : k7 < k30 - 2 ? "#f87171" : "#64748b",
          fontSize:9, fontWeight:700,
        }}>
          {k7 > k30 ? "🔥 Opp striking out MORE lately" 
            : k7 < k30 - 2 ? "📉 Opp making more contact lately"
            : "📊 Opp K rate stable"}
        </div>
      )}
    </div>
  );
}

function AutoRow({ r, onUpdateNote, onToggleLock, kLine, onKLineChange }) {
  const [expanded, setExpanded] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteVal, setNoteVal] = useState(r.note || "");

  const pg       = gradeK(r.pitcherK);
  const og       = gradeOpp(r.oppK);
  const kGrade   = combinedKGrade(pg, og);
  const bg       = gradeBB(r.bbPct);
  const og2      = gradeOuts(r.outsAvg, r.outsHitRate);
  const isLock   = noteVal?.includes("🔒");
  const hasInjury = !!r.injury;
  const hasWeatherAlert = r.weather?.alert;
  const lockInfo = calcLockScore(r, kLine);

  const saveNote = () => { onUpdateNote(r.playerId, noteVal); setEditingNote(false); };

  const rowBg = hasInjury ? "#1a0500"
    : isLock ? "#061a0a"
    : expanded ? "#0d1628"
    : "transparent";

  return (
    <>
      <tr style={{ borderBottom: expanded?"none":"1px solid #1f2937", background:rowBg, cursor:"pointer" }}>
        <td style={{padding:"6px 4px", textAlign:"center", width:28}} onClick={() => onToggleLock(r.playerId)}>
          <span style={{fontSize:14, cursor:"pointer", opacity: isLock?1:0.25}}>🔒</span>
        </td>

        <td style={{padding:"8px 8px"}} onClick={() => setExpanded(!expanded)}>
          <div style={{display:"flex", alignItems:"center", gap:5, flexWrap:"wrap"}}>
            <span style={{color: hasInjury?"#ff9944": isLock?"#4ade80":"#f1f5f9", fontWeight:700, fontSize:13}}>
              {r.pitcher}
            </span>
            {hasInjury && <InjuryBadge injury={r.injury}/>}
            {hasWeatherAlert && <WeatherBadge weather={r.weather}/>}
            <span style={{background:"#1d4ed8", color:"#fff", borderRadius:3, padding:"1px 5px", fontSize:8, fontWeight:700}}>AUTO</span>
          </div>
          <div style={{color:"#475569", fontSize:10, marginTop:2}}>
            vs {r.opp} · {r.date}
            {r.weather && !r.weather.alert && !r.weather.isIndoor && (
              <span style={{color:"#334155", marginLeft:6}}>{r.weather.summary}</span>
            )}
          </div>
        </td>

        <td style={{padding:"9px 6px", textAlign:"center"}} onClick={() => setExpanded(!expanded)}>
          <div style={{marginBottom:3}}>
            <Pill value={r.pitcherK.toFixed(1)} grade={pg} suffix="%"/>
          </div>
          <div style={{color:GRADE_COLORS[kGrade], fontWeight:700, fontSize:9}}>{kGrade}</div>
        </td>

        <td style={{padding:"9px 6px", textAlign:"center"}} onClick={() => setExpanded(!expanded)}>
          <Dot grade={bg} label="BB"/>
          <div style={{color:bg==="green"?"#4ade80":bg==="yellow"?"#facc15":"#f87171", fontSize:9, fontWeight:700, marginTop:2}}>
            {r.bbPct.toFixed(1)}%
          </div>
        </td>

        <td style={{padding:"9px 6px", textAlign:"center"}} onClick={() => setExpanded(!expanded)}>
          <Dot grade={og2} label="OUTS"/>
          <div style={{color:og2==="green"?"#4ade80":og2==="yellow"?"#facc15":"#f87171", fontSize:9, fontWeight:700, marginTop:2}}>
            {r.outsAvg > 0 ? r.outsAvg.toFixed(1) : "—"}
          </div>
        </td>

        {/* K avg + expected */}
        <td style={{padding:"9px 6px", textAlign:"center"}} onClick={() => setExpanded(!expanded)}>
          {r.avgK !== null ? (
            <>
              <div style={{color:"#f1f5f9", fontWeight:700, fontSize:11}}>{r.avgK}K</div>
              {r.expectedK && <div style={{color:"#7c3aed", fontSize:8}}>~{r.expectedK} exp</div>}
            </>
          ) : <span style={{color:"#1e293b", fontSize:9}}>—</span>}
        </td>

        {/* Lock score */}
        <td style={{padding:"9px 6px", textAlign:"center"}} onClick={() => setExpanded(!expanded)}>
          <LockScoreBadge score={lockInfo.score} grade={lockInfo.grade}/>
        </td>

        <td style={{padding:"9px 8px", textAlign:"center", color:"#3b82f6", fontSize:14}} onClick={() => setExpanded(!expanded)}>
          {expanded?"▲":"▼"}
        </td>
      </tr>

      {expanded && (
        <tr style={{borderBottom:"1px solid #1f2937", background:"#0a0f1a"}}>
          <td colSpan={8} style={{padding:"10px 14px 14px"}}>

            {(hasInjury || hasWeatherAlert) && (
              <div style={{marginBottom:10, display:"flex", gap:6, flexWrap:"wrap"}}>
                {hasInjury && (
                  <div style={{background:"#1a0500", border:"1px solid #dc2626", borderRadius:8, padding:"6px 10px", color:"#f87171", fontSize:10, fontWeight:700}}>
                    🚨 {r.injury.flag} — Verify before playing any props
                  </div>
                )}
                {hasWeatherAlert && (
                  <div style={{background:"#1a1000", border:"1px solid #92400e", borderRadius:8, padding:"6px 10px", color:"#fbbf24", fontSize:10, fontWeight:700}}>
                    {r.weather.summary} — Weather may affect game
                  </div>
                )}
              </div>
            )}

            {/* Stats grid — 5 panels */}
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr", gap:8, marginBottom:10}}>

              {/* K Matchup */}
              <div style={{background:"#0d1117", border:"1px solid #1e293b", borderRadius:10, padding:"10px 12px"}}>
                <div style={{color:"#475569", fontSize:9, letterSpacing:3, marginBottom:8}}>K MATCHUP</div>
                <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>Pitcher K%</span>
                  <Pill value={r.pitcherK.toFixed(1)} grade={pg} suffix="%"/>
                </div>
                <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>Opp K% L{r.oppKDays||7}</span>
                  <Pill value={r.oppK>0?r.oppK.toFixed(1):"—"} grade={og} suffix={r.oppK>0?"%":""}/>
                </div>
                <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>Grade</span>
                  <span style={{color:GRADE_COLORS[kGrade], fontWeight:700, fontSize:10}}>{kGrade}</span>
                </div>
                <div style={{display:"flex", justifyContent:"space-between"}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>ERA · {r.gs} GS</span>
                  <span style={{color:"#f1f5f9",fontWeight:700,fontSize:10}}>{r.era?.toFixed(2)??"—"}</span>
                </div>
              </div>

              {/* K Line Analysis */}
              <KLinePanel r={r} kLine={kLine} onKLineChange={onKLineChange}/>

              {/* Walks */}
              <div style={{background:"#0d1117", border:"1px solid #1e293b", borderRadius:10, padding:"10px 12px"}}>
                <div style={{color:"#475569", fontSize:9, letterSpacing:3, marginBottom:8}}>WALKS</div>
                <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>Season BB%</span>
                  <Pill value={r.bbPct.toFixed(1)} grade={bg} suffix="%"/>
                </div>
                <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>Avg BBs</span>
                  <span style={{color:"#f1f5f9",fontWeight:700,fontSize:12}}>{r.bbAvg.toFixed(1)}</span>
                </div>
                <div style={{display:"flex", justifyContent:"space-between"}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>Play</span>
                  <span style={{color:bg==="green"?"#4ade80":bg==="yellow"?"#facc15":"#f87171",fontWeight:700,fontSize:10}}>
                    {bg==="green"?"MORE ↑":bg==="red"?"LESS ↓":"NEUTRAL"} {r.bbLine}
                  </span>
                </div>
              </div>

              {/* Outs */}
              <div style={{background:"#0d1117", border:"1px solid #1e293b", borderRadius:10, padding:"10px 12px"}}>
                <div style={{color:"#475569", fontSize:9, letterSpacing:3, marginBottom:8}}>OUTS / IP</div>
                <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>Avg outs</span>
                  <Pill value={r.outsAvg>0?r.outsAvg.toFixed(1):"N/A"} grade={og2}/>
                </div>
                <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>Hit rate</span>
                  <span style={{color:r.outsHitRate>=67?"#4ade80":r.outsHitRate>=33?"#facc15":"#f87171",fontWeight:700,fontSize:12}}>
                    {r.outsHitRate}%
                  </span>
                </div>
                <div style={{display:"flex", justifyContent:"space-between"}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>Play</span>
                  <span style={{color:og2==="green"?"#4ade80":og2==="yellow"?"#facc15":"#f87171",fontWeight:700,fontSize:10}}>
                    {og2==="green"?"MORE ↑":og2==="red"?"LESS ↓":"NEUTRAL"} {r.outsLine}
                  </span>
                </div>
              </div>

              {/* Pitch Count */}
              <div style={{background:"#0d1117", border:"1px solid #1e293b", borderRadius:10, padding:"10px 12px"}}>
                <div style={{color:"#475569", fontSize:9, letterSpacing:3, marginBottom:8}}>PITCH COUNT</div>
                <PCStats r={r}/>
              </div>
            </div>

            {/* K Trend + Opp Splits — full width row */}
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10}}>
              {/* K per last 5 starts visual */}
              <div style={{background:"#0d1117", border:"1px solid #1e293b", borderRadius:10, padding:"10px 12px"}}>
                <div style={{color:"#475569", fontSize:9, letterSpacing:3, marginBottom:4}}>K PER LAST {r.kArr?.length || 5} STARTS</div>
                <div style={{display:"flex", gap:4, alignItems:"center", flexWrap:"wrap", marginBottom:4}}>
                  {r.kArr?.map((k, i) => {
                    const isLast = i === (r.kArr.length - 1);
                    const kLineVal = kLine;
                    const cleared = kLineVal ? k > kLineVal : null;
                    return (
                      <div key={i} style={{
                        background: isLast ? "#0f1f3d"
                          : cleared === true ? "#061a0a"
                          : cleared === false ? "#1a0505"
                          : "#0f172a",
                        border: `1px solid ${isLast ? "#3b82f6" : cleared === true ? "#16a34a" : cleared === false ? "#dc2626" : "#334155"}`,
                        borderRadius:5, padding:"4px 8px", textAlign:"center", minWidth:32,
                      }}>
                        <div style={{color: isLast ? "#60a5fa" : cleared === true ? "#4ade80" : cleared === false ? "#f87171" : "#f1f5f9", fontWeight:700, fontSize:13}}>{k}K</div>
                        <div style={{color:"#475569", fontSize:7}}>S{i+1}</div>
                      </div>
                    );
                  })}
                </div>
                {r.kArr?.length > 0 && <KTrendBar kArr={r.kArr}/>}
                {kLine && (
                  <div style={{marginTop:6, color:"#475569", fontSize:9}}>
                    🟩 = cleared {kLine} line · 🟥 = missed · 🔵 = most recent
                  </div>
                )}
              </div>

              {/* Opp batting K% splits */}
              <div style={{background:"#0d1117", border:"1px solid #1e293b", borderRadius:10, padding:"10px 12px"}}>
                <div style={{color:"#475569", fontSize:9, letterSpacing:3, marginBottom:8}}>
                  OPP BATTER K% · {r.pitcherHand === "L" ? "🔵 LHP" : r.pitcherHand === "R" ? "🔴 RHP" : ""} matchup
                </div>
                <OppKSplitsPanel splits={r.oppKSplits} oppK={r.oppK} oppKDays={oppKDays}/>
              </div>
            </div>

            {/* Weather */}
            {r.weather && (
              <div style={{background:"#060c14", border:`1px solid ${r.weather.alert?"#92400e":"#1e293b"}`, borderRadius:8, padding:"6px 12px", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <div style={{color:"#475569", fontSize:9, letterSpacing:2}}>WEATHER · {r.weather.isIndoor?"INDOOR":"OUTDOOR"}</div>
                <div style={{color:r.weather.alert?"#fbbf24":"#64748b", fontSize:10}}>{r.weather.summary}</div>
              </div>
            )}

            {/* Note editor */}
            <div style={{background:"#060c14", border:"1px solid #1e293b", borderRadius:8, padding:"8px 12px"}}>
              <div style={{color:"#475569", fontSize:9, letterSpacing:3, marginBottom:6}}>YOUR NOTES / EDGE LAYER</div>
              {editingNote ? (
                <div style={{display:"flex", gap:6, alignItems:"flex-start"}}>
                  <textarea
                    value={noteVal}
                    onChange={e => setNoteVal(e.target.value)}
                    rows={3}
                    style={{flex:1, background:"#0f172a", border:"1px solid #334155", color:"#f1f5f9", borderRadius:5, padding:"6px 8px", fontSize:10, fontFamily:"monospace", resize:"vertical", outline:"none"}}
                    placeholder="Spade K% · injury context · PC limit · line value · lock reasoning..."
                    autoFocus
                  />
                  <div style={{display:"flex", flexDirection:"column", gap:4}}>
                    <button onClick={saveNote} style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:5,padding:"5px 10px",cursor:"pointer",fontSize:10,fontWeight:700}}>SAVE</button>
                    <button onClick={() => {setNoteVal(r.note||"");setEditingNote(false);}} style={{background:"#374151",color:"#9ca3af",border:"none",borderRadius:5,padding:"5px 10px",cursor:"pointer",fontSize:10}}>CANCEL</button>
                  </div>
                </div>
              ) : (
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8}}>
                  <div style={{color:noteVal?"#64748b":"#1e293b", fontSize:10, fontStyle:"italic", flex:1}}>
                    {noteVal || "No notes — click EDIT to add Spade data · injury context · lock reasoning"}
                  </div>
                  <button onClick={() => setEditingNote(true)} style={{background:"#1e293b",color:"#94a3b8",border:"1px solid #334155",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontSize:9,fontWeight:700,whiteSpace:"nowrap"}}>
                    ✏️ EDIT
                  </button>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function LiveSlate() {
  const [date, setDate]         = useState(() => new Date().toISOString().split("T")[0]);
  const [oppKDays, setOppKDays] = useState(7);
  const [rows, setRows]         = useState([]);
  const [kLines, setKLines]     = useState({});  // playerId → line value
  const [status, setStatus]     = useState("idle");
  const [error, setError]       = useState("");
  const [progress, setProgress] = useState({ done:0, total:0 });

  const handleFetch = useCallback(async () => {
    setStatus("loading");
    setError("");
    setRows([]);
    setProgress({ done:0, total:0 });
    try {
      const probables = await fetchProbablePitchers(date);
      if (!probables.length) {
        setError(`No probable pitchers found for ${date}. MLB may not have posted them yet.`);
        setStatus("error");
        return;
      }
      setProgress({ done:0, total:probables.length });
      const CHUNK = 4;
      for (let i = 0; i < probables.length; i += CHUNK) {
        const chunk = probables.slice(i, i + CHUNK);
        const results = await Promise.all(chunk.map(p => buildPitcherRow(p, date, oppKDays)));
        const valid = results.filter(Boolean);
        setRows(prev => {
          const existing = new Set(prev.map(r => r.playerId));
          const newOnes = valid.filter(r => !existing.has(r.playerId));
          return [...prev, ...newOnes].sort((a,b) =>
            gradeScore(combinedKGrade(gradeK(b.pitcherK), gradeOpp(b.oppK))) -
            gradeScore(combinedKGrade(gradeK(a.pitcherK), gradeOpp(a.oppK)))
          );
        });
        setProgress({ done:Math.min(i+CHUNK, probables.length), total:probables.length });
      }
      setStatus("done");
    } catch(err) {
      setError(`Fetch failed: ${err.message}`);
      setStatus("error");
    }
  }, [date, oppKDays]);

  const updateNote = useCallback((playerId, note) => {
    setRows(prev => prev.map(r => r.playerId===playerId ? {...r, note} : r));
  }, []);

  const toggleLock = useCallback((playerId) => {
    setRows(prev => prev.map(r => {
      if (r.playerId !== playerId) return r;
      const hasLock = r.note?.includes("🔒");
      const note = hasLock
        ? (r.note||"").replace(/🔒\s*/g,"").trim()
        : "🔒 " + (r.note||"").trim();
      return {...r, note};
    }));
  }, []);

  const updateKLine = useCallback((playerId, line) => {
    setKLines(prev => ({ ...prev, [playerId]: line }));
  }, []);

  const sc = STATUS_COLORS[status];
  const eliteCount = rows.filter(r => combinedKGrade(gradeK(r.pitcherK),gradeOpp(r.oppK))==="⭐⭐ ELITE").length;
  const lockCount  = rows.filter(r => r.note?.includes("🔒")).length;
  const hardLocks  = rows.filter(r => {
    const kLine = kLines[r.playerId];
    const ls = calcLockScore(r, kLine);
    return ls.score >= 6;
  }).length;

  return (
    <div style={{background:"#080d14", minHeight:"100vh", padding:"16px 12px"}}>
      <div style={{marginBottom:16}}>
        <div style={{color:"#3b82f6", fontSize:9, letterSpacing:4, marginBottom:3}}>LIVE AUTO-FETCH · MLB STATS API</div>
        <h1 style={{color:"#f1f5f9", fontSize:18, fontWeight:900, margin:0}}>🔄 SEMI-AUTO RESEARCH</h1>
        <div style={{color:"#475569", fontSize:10, marginTop:2}}>
          Auto: K% · BB% · Outs · Opp K% · Pitch Count · K Line Analysis · Lock Score · Weather
        </div>
        <div style={{color:"#1d4ed8", fontSize:9, marginTop:3, background:"#0f172a", borderRadius:4, padding:"4px 8px", display:"inline-block"}}>
          ℹ️ IL pitchers won't appear — MLB removes them from probable starters automatically. Day-to-day pitchers get a 🚨 flag.
        </div>
      </div>

      {/* Controls */}
      <div style={{background:sc.bg, border:`1px solid ${sc.border}`, borderRadius:10, padding:"12px 14px", marginBottom:12}}>
        <div style={{display:"flex", gap:8, alignItems:"flex-end", flexWrap:"wrap"}}>
          <div style={{display:"flex", flexDirection:"column", gap:3}}>
            <label style={{color:"#475569", fontSize:9, letterSpacing:2}}>DATE</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              style={{background:"#0f172a",border:"1px solid #334155",color:"#f1f5f9",borderRadius:5,padding:"5px 8px",fontSize:11,fontFamily:"monospace",outline:"none"}}/>
          </div>

          <div style={{display:"flex", flexDirection:"column", gap:3}}>
            <label style={{color:"#475569", fontSize:9, letterSpacing:2}}>OPP K% WINDOW</label>
            <div style={{display:"flex", gap:4}}>
              {[7,10].map(d => (
                <button key={d} onClick={() => setOppKDays(d)} style={{
                  background: oppKDays===d?"#7c3aed":"#1e293b",
                  color: oppKDays===d?"#fff":"#94a3b8",
                  border:`1px solid ${oppKDays===d?"#7c3aed":"#334155"}`,
                  borderRadius:5, padding:"5px 10px", cursor:"pointer",
                  fontSize:10, fontWeight:700, fontFamily:"monospace",
                }}>L{d}</button>
              ))}
            </div>
          </div>

          <button onClick={handleFetch} disabled={status==="loading"} style={{
            background:status==="loading"?"#1e293b":"#1d4ed8",
            color:status==="loading"?"#475569":"#fff",
            border:"none",borderRadius:6,padding:"8px 18px",
            cursor:status==="loading"?"not-allowed":"pointer",fontSize:11,fontWeight:700
          }}>
            {status==="loading"?`⏳ ${progress.done}/${progress.total} pitchers...`:"🔄 FETCH SLATE"}
          </button>

          {status==="done" && (
            <div style={{color:"#4ade80",fontSize:10}}>
              ✅ {rows.length} pitchers · ⭐ {eliteCount} ELITE · 🔒🔒 {hardLocks} hard locks · 🔒 {lockCount} marked
              · Opp K% L{oppKDays}
            </div>
          )}
          {status==="error" && <div style={{color:"#f87171",fontSize:10}}>{error}</div>}
        </div>
      </div>

      {status==="idle" && (
        <div style={{background:"#0d1117",border:"1px solid #1e293b",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
          <div style={{color:"#475569",fontSize:9,letterSpacing:3,marginBottom:8}}>WHAT AUTO-FETCHES + HOW LOCK SCORE WORKS</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {[
              ["⚾ Pitcher K% + BB% + ERA","Season stats from MLB API"],
              ["📊 Game log outs + K + BB","Last 6 starts auto-calculated"],
              ["🎯 Avg pitch count","Range, IP ceiling, tendency"],
              ["👥 Opp K% L7 or L10","Toggle between windows"],
              ["🔢 K Line Analysis","Enter PrizePicks line → hit rate + K log"],
              ["🏆 Lock Score 0-7","K% · Opp K% · Hit rate · PC · Health · Weather · ERA"],
              ["🌧️ Weather at game time","Temp · rain % · wind · indoor flag"],
              ["✏️ Your edge layer","Notes, Spade data, context"],
            ].map(([title,desc]) => (
              <div key={title} style={{background:"#060c14",borderRadius:6,padding:"6px 10px"}}>
                <div style={{color:"#f1f5f9",fontSize:10,fontWeight:700}}>{title}</div>
                <div style={{color:"#475569",fontSize:9,marginTop:2}}>{desc}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:10,background:"#060c14",borderRadius:6,padding:"8px 10px"}}>
            <div style={{color:"#a78bfa",fontSize:9,fontWeight:700,marginBottom:4}}>🏆 LOCK SCORE GUIDE</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[["🔒🔒 LOCK","6-7 signals","#22c55e"],["🔒 LEAN","4-5 signals","#4ade80"],["⚠️ SITUATIONAL","2-3 signals","#eab308"],["❌ FADE","0-1 signals","#ef4444"]]
                .map(([grade,desc,col])=>(
                <div key={grade} style={{background:"#0f172a",borderRadius:5,padding:"4px 8px"}}>
                  <span style={{color:col,fontWeight:700,fontSize:10}}>{grade}</span>
                  <span style={{color:"#475569",fontSize:9,marginLeft:6}}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {status==="loading" && rows.length===0 && (
        <div style={{background:"#0d1117",border:"1px solid #1e293b",borderRadius:10,padding:"24px",textAlign:"center"}}>
          <div style={{color:"#3b82f6",fontSize:12}}>⏳ Pulling slate from MLB Stats API...</div>
          <div style={{color:"#475569",fontSize:9,marginTop:8}}>Season stats · game logs · K per start · pitch counts · opp K% · weather</div>
        </div>
      )}

      {rows.length > 0 && (
        <div style={{background:"#0d1117",border:"1px solid #1e293b",borderRadius:11,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"#111827",borderBottom:"2px solid #1e293b"}}>
                {[["🔒","center"],["PITCHER","left"],["K GRADE","center"],["BB%","center"],["OUTS","center"],["K AVG","center"],["LOCK","center"],["","center"]]
                  .map(([h,a]) => (
                    <th key={h} style={{padding:"8px 6px",textAlign:a,color:"#475569",fontSize:9,letterSpacing:2,fontWeight:700}}>{h}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <AutoRow
                  key={r.playerId}
                  r={r}
                  onUpdateNote={updateNote}
                  onToggleLock={toggleLock}
                  kLine={kLines[r.playerId] || null}
                  onKLineChange={(line) => updateKLine(r.playerId, line)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
