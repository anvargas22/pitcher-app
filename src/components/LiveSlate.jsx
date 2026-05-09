import { useState, useCallback } from "react";
import { fetchProbablePitchers, buildPitcherRow, calcLockScore, calcKHitRate, fetchPitcherResult, saveResult, loadResults, saveNotePermanent, loadNotes, gradeResult } from "../services/mlbApi";
import { gradeK, gradeOpp, combinedKGrade, gradeScore, GRADE_COLORS, gradeBB, gradeOuts } from "../utils/grades";
import { Pill, Dot, PCBadge } from "./Pill";

const STATUS_COLORS = {
  idle:    { bg:"#0f172a", border:"#334155" },
  loading: { bg:"#0f1f3d", border:"#1d4ed8" },
  done:    { bg:"#061a0a", border:"#16a34a" },
  error:   { bg:"#1a0505", border:"#dc2626" },
};

function LockScoreBadge({ score, grade }) {
  const col = grade?.includes("🔒🔒") ? "#22c55e"
    : grade?.includes("🔒") ? "#4ade80"
    : grade?.includes("⚠️") ? "#eab308"
    : "#ef4444";
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
      <div style={{background:"#0f172a",border:`1px solid ${col}`,borderRadius:6,padding:"3px 8px",color:col,fontSize:9,fontWeight:700,whiteSpace:"nowrap"}}>
        {grade || "❌ FADE"}
      </div>
      <div style={{color:"#475569",fontSize:8}}>{score}/7</div>
    </div>
  );
}

function PropLineRow({ label, value, onChange, avg, suffix="" }) {
  const hitRate = value && avg !== null ? null : null;
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
      <span style={{color:"#94a3b8",fontSize:10}}>{label} line</span>
      <input
        type="number" step="0.5" min="0"
        value={value||""}
        onChange={e=>onChange(parseFloat(e.target.value)||null)}
        placeholder="line"
        style={{background:"#0f172a",border:"1px solid #334155",color:"#f1f5f9",borderRadius:5,padding:"3px 6px",width:55,fontSize:11,fontFamily:"monospace",outline:"none",textAlign:"center"}}
      />
    </div>
  );
}

function PropSection({ title, color, arr, line, avg, avgLabel, suffix, onLineChange }) {
  const cleared = arr?.length && line ? arr.filter(v=>v>line).length : null;
  const rate = cleared !== null ? Math.round((cleared/arr.length)*100) : null;
  const rateCol = rate>=67?"#22c55e":rate>=40?"#eab308":"#ef4444";
  return (
    <div style={{background:"#060c14",borderRadius:6,padding:"6px 8px",marginBottom:8}}>
      <div style={{color,fontSize:8,letterSpacing:2,marginBottom:4}}>{title}</div>
      {avg!==null && avg!==undefined && (
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{color:"#94a3b8",fontSize:9}}>{avgLabel}</span>
          <span style={{color:"#f1f5f9",fontWeight:700,fontSize:10}}>{avg}{suffix}</span>
        </div>
      )}
      <PropLineRow label={title.split(" ")[0]} value={line} onChange={onLineChange} avg={avg} suffix={suffix}/>
      {rate!==null && (
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{color:"#94a3b8",fontSize:9}}>Hit rate vs {line}</span>
          <span style={{color:rateCol,fontWeight:700,fontSize:10}}>{rate}% ({cleared}/{arr?.length})</span>
        </div>
      )}
      {arr?.length>0 && (
        <div style={{display:"flex",gap:3,flexWrap:"wrap",marginTop:4}}>
          {arr.map((v,i)=>(
            <span key={i} style={{
              background:line&&v>line?"#061a0a":"#0f172a",
              border:`1px solid ${line&&v>line?"#16a34a":"#1e293b"}`,
              color:line&&v>line?"#4ade80":"#64748b",
              borderRadius:4,padding:"2px 5px",fontSize:10,fontWeight:700
            }}>{v}{suffix}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function AutoRow({ r, onUpdateNote, onToggleLock, kLine, onKLine, bbLine, onBBLine, haLine, onHALine, poLine, onPOLine }) {
  const [expanded, setExpanded] = useState(false);
  const [editNote, setEditNote] = useState(false);
  const [noteVal, setNoteVal] = useState(r.note||"");

  if (!r || r.pitcherK===undefined) return null;

  const pg     = gradeK(r.pitcherK);
  const og     = gradeOpp(r.oppK||0);
  const kGrade = combinedKGrade(pg, og);
  const bg     = gradeBB(r.bbPct||0);
  const og2    = gradeOuts(r.outsAvg||0, r.outsHitRate||0);
  const isLock = noteVal?.includes("🔒");
  const lockInfo = calcLockScore(r, kLine);

  const saveNote = () => { onUpdateNote(r.playerId, noteVal); setEditNote(false); };

  return (
    <>
      <tr style={{borderBottom:expanded?"none":"1px solid #1f2937",background:isLock?"#061a0a":expanded?"#0d1628":"transparent",cursor:"pointer"}}>
        <td style={{padding:"6px 4px",textAlign:"center",width:28}} onClick={()=>onToggleLock(r.playerId)}>
          <span style={{fontSize:14,opacity:isLock?1:0.25}}>🔒</span>
        </td>
        <td style={{padding:"8px"}} onClick={()=>setExpanded(!expanded)}>
          <div style={{color:isLock?"#4ade80":"#f1f5f9",fontWeight:700,fontSize:13}}>{r.pitcher}</div>
          <div style={{color:"#475569",fontSize:10}}>vs {r.opp} · {r.date}
            {r.weather&&!r.weather.alert&&!r.weather.isIndoor&&<span style={{marginLeft:6}}>{r.weather.summary}</span>}
            {r.weather?.alert&&<span style={{color:"#fbbf24",marginLeft:6}}>{r.weather.summary}</span>}
            {r.weather?.isIndoor&&<span style={{color:"#475569",marginLeft:6}}>🏟️ Indoor</span>}
          </div>
        </td>
        <td style={{padding:"9px 6px",textAlign:"center"}} onClick={()=>setExpanded(!expanded)}>
          <Pill value={r.pitcherK.toFixed(1)} grade={pg} suffix="%"/>
          <div style={{color:GRADE_COLORS[kGrade],fontWeight:700,fontSize:9,marginTop:2}}>{kGrade}</div>
        </td>
        <td style={{padding:"9px 6px",textAlign:"center"}} onClick={()=>setExpanded(!expanded)}>
          <Dot grade={bg} label="BB"/>
          <div style={{color:bg==="green"?"#4ade80":bg==="yellow"?"#facc15":"#f87171",fontSize:9,fontWeight:700,marginTop:2}}>{(r.bbPct||0).toFixed(1)}%</div>
        </td>
        <td style={{padding:"9px 6px",textAlign:"center"}} onClick={()=>setExpanded(!expanded)}>
          <Dot grade={og2} label="OUTS"/>
          <div style={{color:og2==="green"?"#4ade80":og2==="yellow"?"#facc15":"#f87171",fontSize:9,fontWeight:700,marginTop:2}}>{r.outsAvg>0?r.outsAvg.toFixed(1):"—"}</div>
        </td>
        <td style={{padding:"9px 6px",textAlign:"center"}} onClick={()=>setExpanded(!expanded)}>
          {r.avgK!==null&&r.avgK!==undefined?<><div style={{color:"#f1f5f9",fontWeight:700,fontSize:11}}>{r.avgK}K</div>{r.expectedK&&<div style={{color:"#7c3aed",fontSize:8}}>~{r.expectedK}</div>}</>:<span style={{color:"#1e293b"}}>—</span>}
        </td>
        <td style={{padding:"9px 6px",textAlign:"center"}} onClick={()=>setExpanded(!expanded)}>
          <LockScoreBadge score={lockInfo.score} grade={lockInfo.grade}/>
        </td>
        <td style={{padding:"9px 8px",textAlign:"center",color:"#3b82f6",fontSize:14}} onClick={()=>setExpanded(!expanded)}>
          {expanded?"▲":"▼"}
        </td>
      </tr>

      {expanded && (
        <tr style={{borderBottom:"1px solid #1f2937",background:"#0a0f1a"}}>
          <td colSpan={8} style={{padding:"10px 14px 14px"}}>

            {/* Injury alert */}
            {r.injury && (
              <div style={{background:"#1a0500",border:"1px solid #dc2626",borderRadius:8,padding:"6px 10px",marginBottom:8,color:"#f87171",fontSize:10,fontWeight:700}}>
                🚨 {r.injury.flag} — Verify before playing props
              </div>
            )}

            {/* Stats grid */}
            <div className="stats-grid-5" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:8,marginBottom:10}}>

              {/* K Matchup */}
              <div style={{background:"#0d1117",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px"}}>
                <div style={{color:"#475569",fontSize:9,letterSpacing:3,marginBottom:8}}>K MATCHUP</div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>Pitcher K%</span>
                  <Pill value={r.pitcherK.toFixed(1)} grade={pg} suffix="%"/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>Opp K% L{r.oppKDays||7}</span>
                  <Pill value={r.oppK>0?r.oppK.toFixed(1):"—"} grade={og} suffix={r.oppK>0?"%":""}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>Grade</span>
                  <span style={{color:GRADE_COLORS[kGrade],fontWeight:700,fontSize:10}}>{kGrade}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>ERA · {r.gs} GS</span>
                  <span style={{color:"#f1f5f9",fontWeight:700,fontSize:10}}>{r.era?.toFixed(2)??"—"}</span>
                </div>
              </div>

              {/* PrizePicks Lines */}
              <div style={{background:"#0d1117",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px"}}>
                <div style={{color:"#475569",fontSize:9,letterSpacing:3,marginBottom:8}}>PRIZEPICKS LINES</div>
                <PropSection title="⚾ K" color="#3b82f6" arr={r.kArr} line={kLine} avg={r.avgK} avgLabel="Avg K/start" suffix="K" onLineChange={onKLine}/>
                <PropSection title="🎯 BB" color="#eab308" arr={r.bbArr} line={bbLine} avg={r.bbAvg} avgLabel="Avg BB/start" suffix="BB" onLineChange={onBBLine}/>
                <PropSection title="🎯 HA" color="#ef4444" arr={r.hArr} line={haLine} avg={r.avgH} avgLabel="Avg H/start" suffix="H" onLineChange={onHALine}/>
                <PropSection title="📊 PO" color="#22c55e" arr={r.outsArr} line={poLine} avg={r.outsAvg} avgLabel="Avg outs" suffix="" onLineChange={onPOLine}/>
              </div>

              {/* Walks */}
              <div style={{background:"#0d1117",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px"}}>
                <div style={{color:"#475569",fontSize:9,letterSpacing:3,marginBottom:8}}>WALKS</div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>Season BB%</span>
                  <Pill value={(r.bbPct||0).toFixed(1)} grade={bg} suffix="%"/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>Avg BBs</span>
                  <span style={{color:"#f1f5f9",fontWeight:700,fontSize:12}}>{r.bbAvg?.toFixed(1)??"—"}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>Play</span>
                  <span style={{color:bg==="green"?"#4ade80":bg==="yellow"?"#facc15":"#f87171",fontWeight:700,fontSize:10}}>
                    {bg==="green"?"MORE ↑":bg==="red"?"LESS ↓":"NEUTRAL"} {r.bbLine}
                  </span>
                </div>
              </div>

              {/* Outs */}
              <div style={{background:"#0d1117",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px"}}>
                <div style={{color:"#475569",fontSize:9,letterSpacing:3,marginBottom:8}}>OUTS / IP</div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>Avg outs</span>
                  <Pill value={r.outsAvg>0?r.outsAvg.toFixed(1):"N/A"} grade={og2}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>Hit rate</span>
                  <span style={{color:r.outsHitRate>=67?"#4ade80":r.outsHitRate>=33?"#facc15":"#f87171",fontWeight:700,fontSize:12}}>{r.outsHitRate}%</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{color:"#94a3b8",fontSize:10}}>PC tend.</span>
                  <PCBadge tendency={r.pcTendency}/>
                </div>
              </div>

              {/* Pitch Count */}
              <div style={{background:"#0d1117",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px"}}>
                <div style={{color:"#475569",fontSize:9,letterSpacing:3,marginBottom:8}}>PITCH COUNT</div>
                {r.avgPC ? (
                  <>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{color:"#94a3b8",fontSize:10}}>Avg PC</span>
                      <span style={{color:r.avgPC>=90?"#22c55e":r.avgPC>=80?"#eab308":"#ef4444",fontWeight:700,fontSize:12}}>{r.avgPC}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{color:"#94a3b8",fontSize:10}}>Range</span>
                      <span style={{color:"#f1f5f9",fontSize:10}}>{r.minPC}–{r.maxPC}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{color:"#94a3b8",fontSize:10}}>IP ceiling</span>
                      <span style={{color:"#a78bfa",fontWeight:700,fontSize:10}}>~{r.ipCeiling} IP</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{color:"#94a3b8",fontSize:10}}>Tendency</span>
                      <PCBadge tendency={r.pcTendency}/>
                    </div>
                  </>
                ) : <span style={{color:"#475569",fontSize:9}}>No PC data</span>}
              </div>
            </div>

            {/* K log + opp splits */}
            <div className="stats-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>

              {/* K per start log */}
              <div style={{background:"#0d1117",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px"}}>
                <div style={{color:"#475569",fontSize:9,letterSpacing:3,marginBottom:6}}>K PER LAST {r.kArr?.length||6} STARTS</div>
                <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:8}}>
                  {r.kArr?.map((k,i)=>{
                    const isLast = i===r.kArr.length-1;
                    const cleared = kLine ? k>kLine : null;
                    const opp = r.oppPerStart?.[i];
                    const oppK = opp?.oppK;
                    const h = r.hArr?.[i];
                    const oppGrade = oppK>=22?"#22c55e":oppK>=18?"#eab308":oppK?"#ef4444":"#475569";
                    const kCol = isLast?"#60a5fa":cleared===true?"#4ade80":cleared===false?"#f87171":"#f1f5f9";
                    const hCol = h>=8?"#ef4444":h>=5?"#eab308":"#22c55e";
                    return (
                      <div key={i} style={{
                        display:"flex",alignItems:"center",justifyContent:"space-between",
                        background:isLast?"#0f1f3d":cleared===true?"#061a0a":cleared===false?"#1a0505":"#0f172a",
                        border:`1px solid ${isLast?"#3b82f6":cleared===true?"#16a34a":cleared===false?"#dc2626":"#1e293b"}`,
                        borderRadius:5,padding:"4px 8px",
                      }}>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          <span style={{color:"#475569",fontSize:8,minWidth:14}}>S{i+1}</span>
                          <span style={{color:kCol,fontWeight:700,fontSize:12}}>{k}K</span>
                          {h!==undefined&&<span style={{color:hCol,fontSize:10,fontWeight:700}}>{h}H</span>}
                          {opp?.abb&&<span style={{color:"#94a3b8",fontSize:9}}>vs {opp.abb}</span>}
                        </div>
                        {oppK!=null?<span style={{color:oppGrade,fontWeight:700,fontSize:9}}>{oppK.toFixed(1)}% {oppK>=22?"🟢":oppK>=18?"🟡":"🔴"}</span>
                          :opp?.abb?<span style={{color:"#334155",fontSize:8}}>loading...</span>:null}
                      </div>
                    );
                  })}
                </div>
                {r.avgH!==null&&r.avgH!==undefined&&(
                  <div style={{color:"#475569",fontSize:9}}>
                    Avg H allowed: <span style={{color:r.avgH>=8?"#ef4444":r.avgH>=5?"#eab308":"#22c55e",fontWeight:700}}>{r.avgH}H</span>
                  </div>
                )}
              </div>

              {/* Opp K splits */}
              <div style={{background:"#0d1117",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px"}}>
                <div style={{color:"#475569",fontSize:9,letterSpacing:3,marginBottom:8}}>
                  OPP BATTER K% · {r.pitcherHand==="L"?"🔵 LHP":r.pitcherHand==="R"?"🔴 RHP":""}
                </div>
                {r.oppKSplits ? (
                  <>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                      <span style={{color:"#94a3b8",fontSize:10}}>L7 K%</span>
                      <span style={{color:r.oppKSplits.k7>=22?"#22c55e":r.oppKSplits.k7>=18?"#eab308":"#ef4444",fontWeight:700,fontSize:11}}>{r.oppKSplits.k7?.toFixed(1)??"—"}%</span>
                    </div>
                    {r.oppKSplits.k30&&(
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                        <span style={{color:"#94a3b8",fontSize:10}}>L30 K%</span>
                        <span style={{color:r.oppKSplits.k30>=22?"#22c55e":r.oppKSplits.k30>=18?"#eab308":"#ef4444",fontWeight:700,fontSize:11}}>{r.oppKSplits.k30.toFixed(1)}%</span>
                      </div>
                    )}
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                      <span style={{color:"#94a3b8",fontSize:10}}>Trend</span>
                      <span style={{color:r.oppKSplits.trend?.includes("↗️")?"#22c55e":r.oppKSplits.trend?.includes("↘️")?"#ef4444":"#94a3b8",fontWeight:700,fontSize:10}}>{r.oppKSplits.trend}</span>
                    </div>
                    {r.oppKSplits.k7&&r.oppKSplits.k30&&(
                      <div style={{marginTop:4,padding:"3px 6px",borderRadius:4,
                        background:r.oppKSplits.k7>r.oppKSplits.k30?"#061a0a":r.oppKSplits.k7<r.oppKSplits.k30-2?"#1a0505":"#0f172a",
                        border:`1px solid ${r.oppKSplits.k7>r.oppKSplits.k30?"#16a34a":r.oppKSplits.k7<r.oppKSplits.k30-2?"#dc2626":"#334155"}`,
                        color:r.oppKSplits.k7>r.oppKSplits.k30?"#4ade80":r.oppKSplits.k7<r.oppKSplits.k30-2?"#f87171":"#64748b",
                        fontSize:9,fontWeight:700}}>
                        {r.oppKSplits.k7>r.oppKSplits.k30?"🔥 Opp striking out MORE lately":r.oppKSplits.k7<r.oppKSplits.k30-2?"📉 Opp making more contact":"📊 Opp K rate stable"}
                      </div>
                    )}
                  </>
                ):<span style={{color:"#475569",fontSize:9}}>Loading splits...</span>}
              </div>
            </div>

            {/* Lock score */}
            <div style={{background:"#060c14",border:"1px solid #1e293b",borderRadius:8,padding:"8px 12px",marginBottom:8}}>
              <div style={{color:"#475569",fontSize:9,letterSpacing:3,marginBottom:6}}>LOCK SCORE BREAKDOWN</div>
              {lockInfo.signals.map((s,i)=>(
                <div key={i} style={{color:s.startsWith("✅")?"#4ade80":s.startsWith("⬜")?"#475569":"#f87171",fontSize:9,marginBottom:2}}>{s}</div>
              ))}
            </div>

            {/* Weather */}
            {r.weather&&(
              <div style={{background:"#060c14",border:`1px solid ${r.weather.alert?"#92400e":"#1e293b"}`,borderRadius:8,padding:"6px 12px",marginBottom:8,display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"#475569",fontSize:9}}>WEATHER</span>
                <span style={{color:r.weather.alert?"#fbbf24":"#64748b",fontSize:10}}>{r.weather.summary}</span>
              </div>
            )}

            {/* Notes */}
            <div style={{background:"#060c14",border:"1px solid #1e293b",borderRadius:8,padding:"8px 12px"}}>
              <div style={{color:"#475569",fontSize:9,letterSpacing:3,marginBottom:6}}>YOUR NOTES</div>
              {editNote?(
                <div style={{display:"flex",gap:6,alignItems:"flex-start"}}>
                  <textarea value={noteVal} onChange={e=>setNoteVal(e.target.value)} rows={3}
                    style={{flex:1,background:"#0f172a",border:"1px solid #334155",color:"#f1f5f9",borderRadius:5,padding:"6px 8px",fontSize:10,fontFamily:"monospace",resize:"vertical",outline:"none"}}
                    placeholder="Spade data · injury context · lock reasoning..." autoFocus/>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    <button onClick={saveNote} style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:5,padding:"5px 10px",cursor:"pointer",fontSize:10,fontWeight:700}}>SAVE</button>
                    <button onClick={()=>{setNoteVal(r.note||"");setEditNote(false);}} style={{background:"#374151",color:"#9ca3af",border:"none",borderRadius:5,padding:"5px 10px",cursor:"pointer",fontSize:10}}>CANCEL</button>
                  </div>
                </div>
              ):(
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                  <div style={{color:noteVal?"#64748b":"#1e293b",fontSize:10,fontStyle:"italic",flex:1}}>
                    {noteVal||"No notes — click EDIT to add context"}
                  </div>
                  <button onClick={()=>setEditNote(true)} style={{background:"#1e293b",color:"#94a3b8",border:"1px solid #334155",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontSize:9,fontWeight:700}}>✏️ EDIT</button>
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
  const [date, setDate]         = useState(()=>new Date().toISOString().split("T")[0]);
  const [oppKDays, setOppKDays] = useState(7);
  const [rows, setRows]         = useState([]);
  const [kLines, setKLines]     = useState({});
  const [bbLines, setBBLines]   = useState({});
  const [haLines, setHALines]   = useState({});
  const [poLines, setPOLines]   = useState({});
  const [results, setResults]   = useState({});
  const [status, setStatus]     = useState("idle");
  const [error, setError]       = useState("");
  const [progress, setProgress] = useState({done:0,total:0});
  const [pulling, setPulling]   = useState(false);
  const [pullStatus, setPullStatus] = useState("");

  const handleFetch = useCallback(async()=>{
    setStatus("loading"); setError(""); setRows([]); setProgress({done:0,total:0});
    try {
      const probables = await fetchProbablePitchers(date);
      if (!probables.length) { setError(`No probable pitchers for ${date} yet.`); setStatus("error"); return; }
      setProgress({done:0,total:probables.length});
      const CHUNK=4;
      for (let i=0;i<probables.length;i+=CHUNK) {
        const chunk=probables.slice(i,i+CHUNK);
        const results=await Promise.all(chunk.map(p=>buildPitcherRow(p,date,oppKDays)));
        const valid=results.filter(Boolean);
        setRows(prev=>{
          const existing=new Set(prev.map(r=>r.playerId));
          const newOnes=valid.filter(r=>!existing.has(r.playerId));
          return [...prev,...newOnes].sort((a,b)=>
            gradeScore(combinedKGrade(gradeK(b.pitcherK),gradeOpp(b.oppK)))-
            gradeScore(combinedKGrade(gradeK(a.pitcherK),gradeOpp(a.oppK)))
          );
        });
        setProgress({done:Math.min(i+CHUNK,probables.length),total:probables.length});
      }
      setStatus("done");
      const [savedNotes,savedResults]=await Promise.all([loadNotes(date),loadResults(date)]);
      if (savedNotes.length) {
        setRows(prev=>prev.map(r=>{const s=savedNotes.find(n=>n.playerId===r.playerId);return s?{...r,note:s.note||r.note}:r;}));
        const kl={};savedNotes.forEach(n=>{if(n.kLine)kl[n.playerId]=n.kLine;});
        if (Object.keys(kl).length) setKLines(prev=>({...prev,...kl}));
      }
      if (savedResults.length) {
        const rm={};savedResults.forEach(r=>{rm[r.playerId]=r.result;});
        setResults(rm);
      }
    } catch(err) { setError(`Fetch failed: ${err.message}`); setStatus("error"); }
  },[date,oppKDays]);

  const updateNote=useCallback((playerId,note)=>{
    setRows(prev=>prev.map(r=>r.playerId===playerId?{...r,note}:r));
    const kLine=kLines[playerId];
    saveNotePermanent(date,playerId,note,kLine,note?.includes("🔒"));
  },[date,kLines]);

  const toggleLock=useCallback((playerId)=>{
    setRows(prev=>prev.map(r=>{
      if(r.playerId!==playerId)return r;
      const hasLock=r.note?.includes("🔒");
      const note=hasLock?(r.note||"").replace(/🔒\s*/g,"").trim():"🔒 "+(r.note||"").trim();
      return{...r,note};
    }));
  },[]);

  const updateKLine=useCallback((playerId,line)=>{
    setKLines(prev=>({...prev,[playerId]:line}));
    const row=rows.find(r=>r.playerId===playerId);
    saveNotePermanent(date,playerId,row?.note||"",line,row?.note?.includes("🔒"));
  },[date,rows]);

  const updateBBLine=useCallback((playerId,line)=>setBBLines(prev=>({...prev,[playerId]:line})),[]);
  const updateHALine=useCallback((playerId,line)=>setHALines(prev=>({...prev,[playerId]:line})),[]);
  const updatePOLine=useCallback((playerId,line)=>setPOLines(prev=>({...prev,[playerId]:line})),[]);

  const handlePullResults=useCallback(async()=>{
    if(!rows.length)return;
    setPulling(true); setPullStatus("Pulling results...");
    let cashed=0,missed=0,total=0;
    for(const r of rows){
      const result=await fetchPitcherResult(r.playerId,date);
      if(!result)continue;
      total++;
      const kLine=kLines[r.playerId];
      const grades=gradeResult(result,kLine,bbLines[r.playerId]||r.bbLine,poLines[r.playerId]||r.outsLine,haLines[r.playerId]);
      const resultObj={...result,grades,kLine};
      setResults(prev=>({...prev,[r.playerId]:resultObj}));
      grades.forEach(g=>{if(g.includes("✅"))cashed++;if(g.includes("❌"))missed++;});
      const resultNote=`RESULT: ${result.ip}IP ${result.hits}H ${result.er}ER ${result.bb}BB ${result.k}K${result.pc?` ${result.pc}pc`:""} — ${grades.join(" · ")}`;
      await saveResult(date,r.playerId,resultObj);
      setRows(prev=>prev.map(row=>{
        if(row.playerId!==r.playerId)return row;
        const existing=row.note||"";
        const newNote=existing.includes("RESULT:")?existing.replace(/RESULT:.*$/,resultNote):(existing?existing+" | "+resultNote:resultNote);
        saveNotePermanent(date,r.playerId,newNote,kLine,newNote.includes("🔒"));
        return{...row,note:newNote};
      }));
    }
    setPullStatus(`✅ ${total} results · ${cashed} cashed · ${missed} missed`);
    setPulling(false);
  },[rows,date,kLines,bbLines,haLines,poLines]);

  const sc=STATUS_COLORS[status];
  const eliteCount=rows.filter(r=>r&&combinedKGrade(gradeK(r.pitcherK),gradeOpp(r.oppK||0))==="⭐⭐ ELITE").length;
  const lockCount=rows.filter(r=>r?.note?.includes("🔒")).length;
  const hardLocks=rows.filter(r=>{if(!r)return false;const ls=calcLockScore(r,kLines[r.playerId]);return ls.score>=6;}).length;

  return (
    <div style={{background:"#080d14",minHeight:"100vh",padding:"16px 12px",fontFamily:"monospace"}}>
      <div style={{marginBottom:16}}>
        <div style={{color:"#3b82f6",fontSize:9,letterSpacing:4,marginBottom:3}}>LIVE AUTO-FETCH · MLB STATS API</div>
        <h1 style={{color:"#f1f5f9",fontSize:18,fontWeight:900,margin:0}}>🔄 SEMI-AUTO RESEARCH</h1>
        <div style={{color:"#475569",fontSize:10,marginTop:2}}>Auto: K% · BB% · Outs · Opp K% · PC · K/BB/HA/PO Lines · Lock Score · Weather</div>
        <div style={{color:"#1d4ed8",fontSize:9,marginTop:3,background:"#0f172a",borderRadius:4,padding:"4px 8px",display:"inline-block"}}>
          ℹ️ IL pitchers won't appear — MLB removes them from probable starters automatically. Day-to-day get a 🚨 flag.
        </div>
      </div>

      <div style={{background:sc.bg,border:`1px solid ${sc.border}`,borderRadius:10,padding:"12px 14px",marginBottom:12}}>
        <div style={{display:"flex",gap:8,alignItems:"flex-end",flexWrap:"wrap"}}>
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            <label style={{color:"#475569",fontSize:9,letterSpacing:2}}>DATE</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              style={{background:"#0f172a",border:"1px solid #334155",color:"#f1f5f9",borderRadius:5,padding:"5px 8px",fontSize:11,fontFamily:"monospace",outline:"none"}}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            <label style={{color:"#475569",fontSize:9,letterSpacing:2}}>OPP K% WINDOW</label>
            <div style={{display:"flex",gap:4}}>
              {[7,10].map(d=>(
                <button key={d} onClick={()=>setOppKDays(d)} style={{
                  background:oppKDays===d?"#7c3aed":"#1e293b",color:oppKDays===d?"#fff":"#94a3b8",
                  border:`1px solid ${oppKDays===d?"#7c3aed":"#334155"}`,
                  borderRadius:5,padding:"5px 10px",cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:"monospace"
                }}>L{d}</button>
              ))}
            </div>
          </div>
          <button onClick={handleFetch} disabled={status==="loading"} style={{
            background:status==="loading"?"#1e293b":"#1d4ed8",color:status==="loading"?"#475569":"#fff",
            border:"none",borderRadius:6,padding:"8px 18px",cursor:status==="loading"?"not-allowed":"pointer",fontSize:11,fontWeight:700
          }}>{status==="loading"?`⏳ ${progress.done}/${progress.total}...`:"🔄 FETCH SLATE"}</button>
          {status==="done"&&(
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span style={{color:"#4ade80",fontSize:10}}>✅ {rows.length} pitchers · ⭐ {eliteCount} ELITE · 🔒🔒 {hardLocks} locks · 🔒 {lockCount} marked · L{oppKDays}</span>
              <button onClick={handlePullResults} disabled={pulling} style={{
                background:pulling?"#1e293b":"#7c3aed",color:pulling?"#475569":"#fff",
                border:"none",borderRadius:6,padding:"6px 14px",cursor:pulling?"not-allowed":"pointer",fontSize:10,fontWeight:700
              }}>{pulling?"⏳ Pulling...":"📊 PULL RESULTS"}</button>
              {pullStatus&&<span style={{color:"#a78bfa",fontSize:10}}>{pullStatus}</span>}
            </div>
          )}
          {status==="error"&&<div style={{color:"#f87171",fontSize:10}}>{error}</div>}
        </div>
      </div>

      {status==="loading"&&rows.length===0&&(
        <div style={{background:"#0d1117",border:"1px solid #1e293b",borderRadius:10,padding:"24px",textAlign:"center"}}>
          <div style={{color:"#3b82f6",fontSize:12}}>⏳ Pulling slate from MLB Stats API...</div>
          <div style={{color:"#475569",fontSize:9,marginTop:8}}>Season stats · game logs · K per start · pitch counts · opp K% · weather</div>
        </div>
      )}

      {rows.length>0&&(
        <div style={{background:"#0d1117",border:"1px solid #1e293b",borderRadius:11,overflow:"hidden"}}>
          <table className="pitcher-table" style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"#111827",borderBottom:"2px solid #1e293b"}}>
                {[["🔒","center"],["PITCHER","left"],["K GRADE","center"],["BB%","center"],["OUTS","center"],["K AVG","center"],["LOCK","center"],["","center"]]
                  .map(([h,a])=>(
                    <th key={h} style={{padding:"8px 6px",textAlign:a,color:"#475569",fontSize:9,letterSpacing:2,fontWeight:700}}>{h}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r=>r&&(
                <AutoRow key={r.playerId} r={{...r,result:results[r.playerId]||null}}
                  onUpdateNote={updateNote} onToggleLock={toggleLock}
                  kLine={kLines[r.playerId]||null} onKLine={l=>updateKLine(r.playerId,l)}
                  bbLine={bbLines[r.playerId]||null} onBBLine={l=>updateBBLine(r.playerId,l)}
                  haLine={haLines[r.playerId]||null} onHALine={l=>updateHALine(r.playerId,l)}
                  poLine={poLines[r.playerId]||null} onPOLine={l=>updatePOLine(r.playerId,l)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
