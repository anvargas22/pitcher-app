import { useState, useMemo } from "react";
import ALL_DATA from "./data/pitchers";
import { gradeK, gradeOpp, gradeBB, gradeOuts, combinedKGrade, gradeScore } from "./utils/grades";
import Row from "./components/Row";
import AddRow from "./components/AddRow";
import Banner from "./components/Banner";
import LiveSlate from "./components/LiveSlate";

const VIEW_MAP = {
  "509":"5/9","508":"5/8","507":"5/7","506":"5/6","505":"5/5","504":"5/4","503":"5/3","502":"5/2","501":"5/1",
  "430":"4/30","429":"4/29","428":"4/28","427":"4/27","426":"4/26","425":"4/25","all":"all"
};

export default function App() {
  const [mode, setMode]         = useState("log");   // "log" | "live"
  const [extra, setExtra]       = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [view, setView]         = useState("509");
  const [filter, setFilter]     = useState("all");

  const allRows = useMemo(() => [...ALL_DATA, ...extra], [extra]);

  const displayed = useMemo(() => {
    let rows = view === "all" ? allRows : allRows.filter(r => r.date === VIEW_MAP[view]);
    if (filter === "elite")   rows = rows.filter(r => combinedKGrade(gradeK(r.pitcherK), gradeOpp(r.oppK)) === "⭐⭐ ELITE");
    if (filter === "bb")      rows = rows.filter(r => r.bbPct !== undefined && gradeBB(r.bbPct) === "green");
    if (filter === "outs")    rows = rows.filter(r => r.outsAvg !== undefined && gradeOuts(r.outsAvg, r.outsHitRate) === "green");
    if (filter === "lock")    rows = rows.filter(r => r.note?.includes("🔒"));
    if (filter === "injured") rows = rows.filter(r => r.note?.includes("DAY-TO-DAY") || r.note?.includes("INJURY") || r.note?.includes("DEBUT") || r.note?.includes("OPENER"));
    return [...rows].sort((a, b) =>
      gradeScore(combinedKGrade(gradeK(b.pitcherK), gradeOpp(b.oppK))) -
      gradeScore(combinedKGrade(gradeK(a.pitcherK), gradeOpp(a.oppK)))
    );
  }, [allRows, view, filter]);

  const currentDate = VIEW_MAP[view] || "today";

  const modeBtn = (m, label) => (
    <button key={m} onClick={() => setMode(m)} style={{
      background: mode===m ? "#7c3aed" : "#1e293b",
      color: mode===m ? "#fff" : "#94a3b8",
      border: "1px solid " + (mode===m ? "#7c3aed" : "#334155"),
      borderRadius: 6, padding: "7px 16px", cursor: "pointer",
      fontSize: 11, fontFamily: "monospace", fontWeight: 700,
    }}>{label}</button>
  );

  const btn = (v, label) => (
    <button key={v} onClick={() => { setView(v); setExpanded(null); }} style={{
      background: view===v ? "#1d4ed8" : "#1e293b",
      color: view===v ? "#fff" : "#94a3b8",
      border: "1px solid " + (view===v ? "#3b82f6" : "#334155"),
      borderRadius: 6, padding: "5px 10px", cursor: "pointer",
      fontSize: 10, fontFamily: "monospace", fontWeight: 700,
    }}>{label}</button>
  );

  const fbtn = (v, label) => (
    <button key={v} onClick={() => setFilter(v)} style={{
      background: filter===v ? "#7c3aed" : "#1e293b",
      color: filter===v ? "#fff" : "#94a3b8",
      border: "1px solid " + (filter===v ? "#7c3aed" : "#334155"),
      borderRadius: 6, padding: "5px 10px", cursor: "pointer",
      fontSize: 10, fontFamily: "monospace", fontWeight: 700,
    }}>{label}</button>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#080d14", fontFamily:"monospace" }}>

      {/* Top mode switcher — always visible */}
      <div style={{ background:"#0d1117", borderBottom:"2px solid #1e293b", padding:"10px 12px", display:"flex", gap:8, alignItems:"center" }}>
        <div style={{ color:"#3b82f6", fontSize:9, letterSpacing:4, marginRight:8 }}>⚾ BLACK HOODIE CO.</div>
        {modeBtn("log",  "📋 GAME LOG")}
        {modeBtn("live", "🔄 LIVE FETCH")}
      </div>

      {/* Live fetch mode */}
      {mode === "live" && <LiveSlate />}

      {/* Game log mode */}
      {mode === "log" && (
        <div style={{ padding:"16px 12px" }}>
          <div style={{ marginBottom:14 }}>
            <h1 style={{ color:"#f1f5f9", fontSize:18, fontWeight:900, margin:0 }}>K% + BB% + OUTS</h1>
            <div style={{ color:"#475569", fontSize:10, marginTop:2 }}>
              {allRows.length} PITCHERS · 4/25–5/9 · GAME LOG VERIFIED · PRIZEPICKS
            </div>
          </div>

          <Banner view={view} />

          {/* Legend */}
          <div style={{ display:"flex", gap:10, marginBottom:10, flexWrap:"wrap" }}>
            {[
              ["🟢 K ≥25%","#22c55e"],["🟡 K 20-24%","#eab308"],["🔴 K <20%","#ef4444"],
              ["🟢 BB ≥9%","#22c55e"],["🟡 BB 6-8%","#eab308"],["🔴 BB <6%","#ef4444"],
              ["🟢 Outs ≥18/67%","#22c55e"],["🟡 15-17/33%","#eab308"],["🔴 <15","#ef4444"],
            ].map(([l,c]) => <span key={l} style={{ color:c, fontSize:9 }}>{l}</span>)}
          </div>

          {/* Date nav */}
          <div className="date-nav" style={{ display:"flex", gap:5, marginBottom:8, flexWrap:"wrap" }}>
            {btn("509","🔥 5/9")}{btn("508","5/8")}{btn("507","⭐ 5/7")}{btn("506","5/6")}{btn("505","5/5")}{btn("504","🔵 5/4")}
            {btn("503","5/3")}{btn("502","5/2")}{btn("501","5/1")}
            {btn("430","4/30")}{btn("429","4/29")}{btn("428","4/28")}
            {btn("427","4/27")}{btn("426","4/26")}{btn("425","4/25")}
            {btn("all","ALL")}
          </div>

          {/* Filter nav */}
          <div className="filter-nav" style={{ display:"flex", gap:5, marginBottom:12, flexWrap:"wrap" }}>
            {fbtn("all","ALL")}{fbtn("elite","⭐ K ELITE")}{fbtn("bb","🟢 BB")}
            {fbtn("outs","🟢 OUTS")}{fbtn("lock","🔒 LOCKS")}{fbtn("injured","🚨 SKIP")}
          </div>

          {/* Table */}
          <div style={{ background:"#0d1117", border:"1px solid #1e293b", borderRadius:11, overflow:"hidden", marginBottom:12 }}>
            <table className="game-log-table" style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#111827", borderBottom:"2px solid #1e293b" }}>
                  {[["PITCHER","left"],["K GRADE","center"],["BB%","center"],["OUTS","center"],["","center"]]
                    .map(([h,a]) => (
                      <th key={h} style={{ padding:"8px 6px", textAlign:a, color:"#475569", fontSize:9, letterSpacing:2, fontWeight:700 }}>{h}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((r, i) => (
                  <Row
                    key={`${r.date}-${r.pitcher}-${i}`}
                    r={r} idx={i}
                    expanded={expanded === i}
                    onToggle={() => setExpanded(expanded === i ? null : i)}
                  />
                ))}
                <AddRow onAdd={r => setExtra(p => [...p, r])} date={currentDate} />
              </tbody>
            </table>
          </div>

          <div style={{ color:"#1e293b", fontSize:9, textAlign:"center" }}>
            GAME LOG VERIFIED 4/25–5/9 · BLACK HOODIE CO. PICKS · PRIZEPICKS
          </div>
        </div>
      )}
    </div>
  );
}
