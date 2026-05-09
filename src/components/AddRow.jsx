import { useState } from "react";

export default function AddRow({ onAdd, date }) {
  const [f, setF] = useState({
    pitcher:"", opp:"", pitcherK:"", oppK:"",
    bbPct:"", bbAvg:"", outsAvg:"", outsHitRate:"", pcTendency:"medium", note:""
  });

  const s = (k, v) => setF(p => ({ ...p, [k]: v }));

  const inp = (ph, k, w=60) => (
    <input
      placeholder={ph}
      value={f[k]}
      onChange={e => s(k, e.target.value)}
      style={{
        background:"#0f172a", border:"1px solid #334155", color:"#f1f5f9",
        borderRadius:5, padding:"4px 6px", width:w, fontSize:10,
        outline:"none", fontFamily:"monospace",
      }}
    />
  );

  const handleAdd = () => {
    if (!f.pitcher || !f.pitcherK || !f.oppK) return;
    onAdd({
      date,
      pitcher: f.pitcher,
      opp: f.opp,
      pitcherK: parseFloat(f.pitcherK),
      oppK: parseFloat(f.oppK),
      bbPct: f.bbPct ? parseFloat(f.bbPct) : undefined,
      bbAvg: f.bbAvg ? parseFloat(f.bbAvg) : undefined,
      outsAvg: f.outsAvg ? parseFloat(f.outsAvg) : undefined,
      outsHitRate: f.outsHitRate ? parseFloat(f.outsHitRate) : undefined,
      pcTendency: f.pcTendency,
      note: f.note,
    });
    setF({ pitcher:"", opp:"", pitcherK:"", oppK:"", bbPct:"", bbAvg:"", outsAvg:"", outsHitRate:"", pcTendency:"medium", note:"" });
  };

  return (
    <tr style={{ background:"#0a1628", borderTop:"2px solid #334155" }}>
      <td style={{ padding:"6px 8px" }}>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {inp("Pitcher","pitcher",85)}
          {inp("Opp","opp",40)}
        </div>
      </td>
      <td style={{ padding:"6px 4px", textAlign:"center" }}>
        <div style={{ display:"flex", gap:3, flexDirection:"column", alignItems:"center" }}>
          {inp("P K%","pitcherK",52)}
          {inp("Opp K%","oppK",52)}
        </div>
      </td>
      <td style={{ padding:"6px 4px", textAlign:"center" }}>
        <div style={{ display:"flex", gap:3, flexDirection:"column", alignItems:"center" }}>
          {inp("BB%","bbPct",52)}
          {inp("BB avg","bbAvg",52)}
        </div>
      </td>
      <td style={{ padding:"6px 4px", textAlign:"center" }}>
        <div style={{ display:"flex", gap:3, flexDirection:"column", alignItems:"center" }}>
          {inp("Avg outs","outsAvg",55)}
          {inp("Hit rate%","outsHitRate",55)}
        </div>
      </td>
      <td style={{ padding:"6px 6px", textAlign:"center" }}>
        <button
          onClick={handleAdd}
          style={{
            background:"#1d4ed8", color:"#fff", border:"none", borderRadius:5,
            padding:"5px 10px", cursor:"pointer", fontSize:11, fontWeight:700,
          }}
        >
          +ADD
        </button>
      </td>
    </tr>
  );
}
