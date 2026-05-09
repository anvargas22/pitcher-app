import { gradeK, gradeOpp, gradeBB, gradeOuts, combinedKGrade, GRADE_COLORS } from "../utils/grades";
import { Pill, Dot, PCBadge } from "./Pill";

export default function Row({ r, idx, expanded, onToggle }) {
  if (!r) return null;
  if (r.pitcherK === undefined || r.pitcherK === null) return null;
  if (r.oppK === undefined || r.oppK === null) return null;

  const pg     = gradeK(r.pitcherK);
  const og     = gradeOpp(r.oppK);
  const kGrade = combinedKGrade(pg, og);
  const isLocked  = r.note?.includes("🔒");
  const isInjured = r.note?.includes("DAY-TO-DAY") || r.note?.includes("INJURY") ||
                    r.note?.includes("SEASON DEBUT") || r.note?.includes("OPENER");
  const has430    = r.bbPct !== undefined;
  const bg  = has430 ? gradeBB(r.bbPct) : null;
  const og2 = has430 ? gradeOuts(r.outsAvg, r.outsHitRate) : null;

  return (
    <>
      <tr onClick={onToggle} style={{
        borderBottom: expanded ? "none" : "1px solid #1f2937",
        background: isInjured ? "#1a0a00" : isLocked ? "#061a0a" : expanded ? "#0d1628" : "transparent",
        cursor: "pointer",
      }}>
        <td style={{ padding:"9px 10px" }}>
          <div style={{ color: isInjured?"#ff9944": isLocked?"#4ade80":"#f1f5f9", fontWeight:700, fontSize:13 }}>
            {isInjured ? "⚠️ " : ""}{r.pitcher}
          </div>
          <div style={{ color:"#475569", fontSize:10, marginTop:1 }}>vs {r.opp} · {r.date}</div>
        </td>
        <td style={{ padding:"9px 6px", textAlign:"center" }}>
          <div style={{ marginBottom:3 }}>
            <Pill value={r.pitcherK>0?r.pitcherK.toFixed(1):"N/A"} grade={pg} suffix={r.pitcherK>0?"%":""}/>
          </div>
          <div style={{ color: GRADE_COLORS[kGrade], fontWeight:700, fontSize:9 }}>{kGrade}</div>
        </td>
        <td style={{ padding:"9px 6px", textAlign:"center" }}>
          {has430 ? (
            <>
              <Dot grade={bg} label="BB"/>
              <div style={{ color: bg==="green"?"#4ade80": bg==="yellow"?"#facc15":"#f87171", fontSize:9, fontWeight:700, marginTop:2 }}>
                {r.bbPct.toFixed(1)}%
              </div>
            </>
          ) : <span style={{ color:"#1e293b", fontSize:9 }}>—</span>}
        </td>
        <td style={{ padding:"9px 6px", textAlign:"center" }}>
          {has430 ? (
            <>
              <Dot grade={og2} label="OUTS"/>
              <div style={{ color: og2==="green"?"#4ade80": og2==="yellow"?"#facc15":"#f87171", fontSize:9, fontWeight:700, marginTop:2 }}>
                {r.outsAvg>0 ? r.outsAvg.toFixed(1) : "N/A"}
              </div>
            </>
          ) : <span style={{ color:"#1e293b", fontSize:9 }}>—</span>}
        </td>
        <td style={{ padding:"9px 8px", textAlign:"center", color:"#3b82f6", fontSize:14 }}>
          {expanded ? "▲" : "▼"}
        </td>
      </tr>

      {expanded && (
        <tr style={{ borderBottom:"1px solid #1f2937", background:"#0a0f1a" }}>
          <td colSpan={5} style={{ padding:"10px 14px 14px" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              <div style={{ background:"#0d1117", border:"1px solid #1e293b", borderRadius:10, padding:"10px 12px" }}>
                <div style={{ color:"#475569", fontSize:9, letterSpacing:3, marginBottom:8 }}>K MATCHUP</div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ color:"#94a3b8", fontSize:10 }}>Pitcher K%</span>
                  <Pill value={r.pitcherK>0?r.pitcherK.toFixed(1):"N/A"} grade={pg} suffix={r.pitcherK>0?"%":""}/>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ color:"#94a3b8", fontSize:10 }}>Opp K% L10</span>
                  <Pill value={r.oppK.toFixed(1)} grade={og} suffix="%"/>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ color:"#94a3b8", fontSize:10 }}>Grade</span>
                  <span style={{ color: GRADE_COLORS[kGrade], fontWeight:700, fontSize:10 }}>{kGrade}</span>
                </div>
              </div>
              <div style={{ background:"#0d1117", border:"1px solid #1e293b", borderRadius:10, padding:"10px 12px" }}>
                <div style={{ color:"#475569", fontSize:9, letterSpacing:3, marginBottom:8 }}>WALKS</div>
                {has430 ? (
                  <>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ color:"#94a3b8", fontSize:10 }}>Season BB%</span>
                      <Pill value={r.bbPct.toFixed(1)} grade={bg} suffix="%"/>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ color:"#94a3b8", fontSize:10 }}>Avg BBs</span>
                      <span style={{ color:"#f1f5f9", fontWeight:700, fontSize:12 }}>{r.bbAvg?.toFixed(1)??'—'}</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ color:"#94a3b8", fontSize:10 }}>Play</span>
                      <span style={{ color: bg==="green"?"#4ade80": bg==="yellow"?"#facc15":"#f87171", fontWeight:700, fontSize:10 }}>
                        {bg==="green"?"MORE ↑": bg==="red"?"LESS ↓":"NEUTRAL"} {r.bbLine}
                      </span>
                    </div>
                  </>
                ) : <span style={{ color:"#475569", fontSize:10 }}>Added from 4/30 onward</span>}
              </div>
              <div style={{ background:"#0d1117", border:"1px solid #1e293b", borderRadius:10, padding:"10px 12px" }}>
                <div style={{ color:"#475569", fontSize:9, letterSpacing:3, marginBottom:8 }}>OUTS / IP</div>
                {has430 ? (
                  <>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ color:"#94a3b8", fontSize:10 }}>Avg outs</span>
                      <Pill value={r.outsAvg>0?r.outsAvg.toFixed(1):"N/A"} grade={og2}/>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ color:"#94a3b8", fontSize:10 }}>Hit rate</span>
                      <span style={{ color: r.outsHitRate>=67?"#4ade80": r.outsHitRate>=33?"#facc15":"#f87171", fontWeight:700, fontSize:12 }}>
                        {r.outsHitRate}%
                      </span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ color:"#94a3b8", fontSize:10 }}>Play</span>
                      <span style={{ color: og2==="green"?"#4ade80": og2==="yellow"?"#facc15":"#f87171", fontWeight:700, fontSize:10 }}>
                        {og2==="green"?"MORE ↑": og2==="red"?"LESS ↓":"NEUTRAL"} {r.outsLine}
                      </span>
                    </div>
                  </>
                ) : <span style={{ color:"#475569", fontSize:10 }}>Added from 4/30 onward</span>}
              </div>
            </div>
            {r.note && (
              <div style={{ marginTop:8, background:"#060c14", border:"1px solid #1e293b", borderRadius:8, padding:"6px 12px", color:"#64748b", fontSize:10, fontStyle:"italic" }}>
                {r.note}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
