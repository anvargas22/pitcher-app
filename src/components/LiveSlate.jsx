import { useState, useCallback } from "react";
import { fetchProbablePitchers, buildPitcherRow } from "../services/mlbApi";
import { gradeK, gradeOpp, combinedKGrade, gradeScore, GRADE_COLORS, gradeBB, gradeOuts } from "../utils/grades";
import { Pill, Dot, PCBadge } from "./Pill";

const STATUS_COLORS = {
  idle:    { bg:"#0f172a", border:"#334155" },
  loading: { bg:"#0f1f3d", border:"#1d4ed8" },
  done:    { bg:"#061a0a", border:"#16a34a" },
  error:   { bg:"#1a0505", border:"#dc2626" },
};

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

function LockSuggestions({ suggestions }) {
  if (!suggestions?.length) return null;
  return (
    <div style={{marginTop:6, display:"flex", flexDirection:"column", gap:3}}>
      {suggestions.map((s,i) => (
        <div key={i} style={{
          background: s.includes("🔒") ? "#061a0a" : "#0f172a",
          border: `1px solid ${s.includes("🔒") ? "#16a34a" : "#1e293b"}`,
          borderRadius:5, padding:"4px 8px", color: s.includes("🔒") ? "#4ade80" : "#94a3b8",
          fontSize:10, fontWeight: s.includes("🔒") ? 700 : 400
        }}>
          {s}
        </div>
      ))}
    </div>
  );
}

function AutoRow({ r, onUpdateNote, onToggleLock }) {
  const [expanded, setExpanded] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteVal, setNoteVal] = useState(r.note || "");

  const pg     = gradeK(r.pitcherK);
  const og     = gradeOpp(r.oppK);
  const kGrade = combinedKGrade(pg, og);
  const bg     = gradeBB(r.bbPct);
  const og2    = gradeOuts(r.outsAvg, r.outsHitRate);
  const isLock = noteVal?.includes("🔒");
  const hasInjury = !!r.injury;
  const hasWeatherAlert = r.weather?.alert;

  const saveNote = () => { onUpdateNote(r.playerId, noteVal); setEditingNote(false); };

  const rowBg = hasInjury ? "#1a0500"
    : isLock ? "#061a0a"
    : expanded ? "#0d1628"
    : "transparent";

  return (
    <>
      <tr style={{ borderBottom: expanded?"none":"1px solid #1f2937", background:rowBg, cursor:"pointer" }}>
        {/* Lock toggle */}
        <td style={{padding:"6px 4px", textAlign:"center", width:28}} onClick={() => onToggleLock(r.playerId)}>
          <span style={{fontSize:14, cursor:"pointer", opacity: isLock?1:0.25}}>🔒</span>
        </td>

        {/* Name + badges */}
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

        {/* K grade */}
        <td style={{padding:"9px 6px", textAlign:"center"}} onClick={() => setExpanded(!expanded)}>
          <div style={{marginBottom:3}}>
            <Pill value={r.pitcherK.toFixed(1)} grade={pg} suffix="%"/>
          </div>
          <div style={{color:GRADE_COLORS[kGrade], fontWeight:700, fontSize:9}}>{kGrade}</div>
        </td>

        {/* BB */}
        <td style={{padding:"9px 6px", textAlign:"center"}} onClick={() => setExpanded(!expanded)}>
          <Dot grade={bg} label="BB"/>
          <div style={{color:bg==="green"?"#4ade80":bg==="yellow"?"#facc15":"#f87171", fontSize:9, fontWeight:700, marginTop:2}}>
            {r.bbPct.toFixed(1)}%
          </div>
        </td>

        {/* Outs */}
        <td style={{padding:"9px 6px", textAlign:"center"}} onClick={() => setExpanded(!expanded)}>
          <Dot grade={og2} label="OUTS"/>
          <div style={{color:og2==="green"?"#4ade80":og2==="yellow"?"#facc15":"#f87171", fontSize:9, fontWeight:700, marginTop:2}}>
            {r.outsAvg > 0 ? r.outsAvg.toFixed(1) : "—"}
          </div>
        </td>

        {/* PC */}
        <td style={{padding:"9px 6px", textAlign:"center"}} onClick={() => setExpanded(!expanded)}>
          {r.avgPC ? (
            <>
              <div style={{color: r.avgPC>=90?"#22c55e":r.avgPC>=80?"#eab308":"#ef4444", fontWeight:700, fontSize:11}}>{r.avgPC}</div>
              <div style={{color:"#475569", fontSize:8}}>PC avg</div>
            </>
          ) : <span style={{color:"#1e293b", fontSize:9}}>—</span>}
        </td>

        <td style={{padding:"9px 8px", textAlign:"center", color:"#3b82f6", fontSize:14}} onClick={() => setExpanded(!expanded)}>
          {expanded?"▲":"▼"}
        </td>
      </tr>

      {expanded && (
        <tr style={{borderBottom:"1px solid #1f2937", background:"#0a0f1a"}}>
          <td colSpan={7} style={{padding:"10px 14px 14px"}}>

            {/* Injury + weather alerts */}
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

            {/* Stats grid */}
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:10}}>

              {/* K Matchup */}
              <div style={{background:"#0d1117", border:"1px solid #1e293b", borderRadius:10, padding:"10px 12px"}}>
                <div style={{color:"#475569", fontSize:9, letterSpacing:3, marginBottom:8}}>K MATCHUP</div>
                <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>Pitcher K%</span>
                  <Pill value={r.pitcherK.toFixed(1)} grade={pg} suffix="%"/>
                </div>
                <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>Opp K% L7</span>
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

            {/* Weather full detail */}
            {r.weather && (
              <div style={{background:"#060c14", border:`1px solid ${r.weather.alert?"#92400e":"#1e293b"}`, borderRadius:8, padding:"6px 12px", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <div style={{color:"#475569", fontSize:9, letterSpacing:2}}>WEATHER · {r.weather.isIndoor ? "INDOOR STADIUM" : "OUTDOOR"}</div>
                <div style={{color:r.weather.alert?"#fbbf24":"#64748b", fontSize:10}}>{r.weather.summary}</div>
              </div>
            )}

            {/* Lock suggestions */}
            {r.lockSuggestions?.length > 0 && (
              <div style={{background:"#060c14", border:"1px solid #1e293b", borderRadius:8, padding:"8px 12px", marginBottom:8}}>
                <div style={{color:"#475569", fontSize:9, letterSpacing:3, marginBottom:6}}>AUTO LOCK SUGGESTIONS</div>
                <LockSuggestions suggestions={r.lockSuggestions}/>
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
  const [rows, setRows]         = useState([]);
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
        const results = await Promise.all(chunk.map(p => buildPitcherRow(p, date)));
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
  }, [date]);

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

  const sc = STATUS_COLORS[status];
  const eliteCount   = rows.filter(r => combinedKGrade(gradeK(r.pitcherK),gradeOpp(r.oppK))==="⭐⭐ ELITE").length;
  const lockCount    = rows.filter(r => r.note?.includes("🔒")).length;
  const injuryCount  = rows.filter(r => r.injury).length;
  const weatherCount = rows.filter(r => r.weather?.alert).length;

  return (
    <div style={{background:"#080d14", minHeight:"100vh", padding:"16px 12px"}}>
      <div style={{marginBottom:16}}>
        <div style={{color:"#3b82f6", fontSize:9, letterSpacing:4, marginBottom:3}}>LIVE AUTO-FETCH · MLB STATS API</div>
        <h1 style={{color:"#f1f5f9", fontSize:18, fontWeight:900, margin:0}}>🔄 SEMI-AUTO RESEARCH</h1>
        <div style={{color:"#475569", fontSize:10, marginTop:2}}>
          Auto: K% · BB% · Outs · Opp K% L7 · Pitch Count · Injuries · Weather · Lock Suggestions
        </div>
      </div>

      {/* Fetch controls */}
      <div style={{background:sc.bg, border:`1px solid ${sc.border}`, borderRadius:10, padding:"12px 14px", marginBottom:12}}>
        <div style={{display:"flex", gap:8, alignItems:"flex-end", flexWrap:"wrap"}}>
          <div style={{display:"flex", flexDirection:"column", gap:3}}>
            <label style={{color:"#475569", fontSize:9, letterSpacing:2}}>DATE</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              style={{background:"#0f172a",border:"1px solid #334155",color:"#f1f5f9",borderRadius:5,padding:"5px 8px",fontSize:11,fontFamily:"monospace",outline:"none"}}/>
          </div>
          <button onClick={handleFetch} disabled={status==="loading"} style={{
            background:status==="loading"?"#1e293b":"#1d4ed8",
            color:status==="loading"?"#475569":"#fff",
            border:"none",borderRadius:6,padding:"8px 18px",
            cursor:status==="loading"?"not-allowed":"pointer",fontSize:11,fontWeight:700
          }}>
            {status==="loading" ? `⏳ ${progress.done}/${progress.total} pitchers...` : "🔄 FETCH SLATE"}
          </button>
          {status==="done" && (
            <div style={{color:"#4ade80",fontSize:10}}>
              ✅ {rows.length} pitchers · ⭐ {eliteCount} ELITE · 🔒 {lockCount} locked
              {injuryCount > 0 && <span style={{color:"#f87171"}}> · 🚨 {injuryCount} injury flag</span>}
              {weatherCount > 0 && <span style={{color:"#fbbf24"}}> · ⛈️ {weatherCount} weather alert</span>}
            </div>
          )}
          {status==="error" && <div style={{color:"#f87171",fontSize:10}}>{error}</div>}
        </div>
      </div>

      {/* How it works */}
      {status==="idle" && (
        <div style={{background:"#0d1117",border:"1px solid #1e293b",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
          <div style={{color:"#475569",fontSize:9,letterSpacing:3,marginBottom:8}}>WHAT AUTO-FETCHES</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {[
              ["⚾ Pitcher K% + BB% + ERA","Season stats from MLB API"],
              ["📊 Game log outs + BB/start","Last 6 starts auto-calculated"],
              ["🎯 Avg pitch count","Range, ceiling estimate, tendency"],
              ["👥 Opp K% L7","Team batting SO/AB last 7 days"],
              ["🚨 Injury / IL flags","Active roster + IL status check"],
              ["🌧️ Weather at game time","Temp · rain % · wind · indoor flag"],
              ["🔒 Lock suggestions","Auto-grades vs your thresholds"],
              ["✏️ Your edge layer","Notes, Spade data, context you add"],
            ].map(([title,desc]) => (
              <div key={title} style={{background:"#060c14",borderRadius:6,padding:"6px 10px"}}>
                <div style={{color:"#f1f5f9",fontSize:10,fontWeight:700}}>{title}</div>
                <div style={{color:"#475569",fontSize:9,marginTop:2}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status==="loading" && rows.length===0 && (
        <div style={{background:"#0d1117",border:"1px solid #1e293b",borderRadius:10,padding:"24px",textAlign:"center"}}>
          <div style={{color:"#3b82f6",fontSize:12}}>⏳ Pulling slate from MLB Stats API...</div>
          <div style={{color:"#475569",fontSize:9,marginTop:8}}>Season stats · game logs · pitch counts · opp K% · injuries · weather</div>
        </div>
      )}

      {rows.length > 0 && (
        <div style={{background:"#0d1117",border:"1px solid #1e293b",borderRadius:11,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"#111827",borderBottom:"2px solid #1e293b"}}>
                {[["🔒","center"],["PITCHER","left"],["K GRADE","center"],["BB%","center"],["OUTS","center"],["PC AVG","center"],["","center"]]
                  .map(([h,a]) => (
                    <th key={h} style={{padding:"8px 6px",textAlign:a,color:"#475569",fontSize:9,letterSpacing:2,fontWeight:700}}>{h}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <AutoRow key={r.playerId} r={r} onUpdateNote={updateNote} onToggleLock={toggleLock}/>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
