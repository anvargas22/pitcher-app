import { PILL_COLORS } from "../utils/grades";

export function Pill({ value, grade, suffix="" }) {
  return (
    <span style={{
      background: PILL_COLORS[grade],
      color: "#fff",
      borderRadius: 5,
      padding: "2px 8px",
      fontFamily: "monospace",
      fontWeight: 700,
      fontSize: 11,
    }}>
      {value}{suffix}
    </span>
  );
}

export function PCBadge({ tendency }) {
  const map = { high:["#16a34a","HIGH"], medium:["#ca8a04","MED"], low:["#dc2626","LOW"] };
  const [col, label] = map[tendency] || ["#475569","?"];
  return (
    <span style={{
      background: col, color: "#fff", borderRadius: 4,
      padding: "1px 7px", fontSize: 10, fontWeight: 700, fontFamily: "monospace",
    }}>
      PC {label}
    </span>
  );
}

export function Dot({ grade, label }) {
  const col = grade==="green"?"#22c55e":grade==="yellow"?"#eab308":"#ef4444";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
      <div style={{ width:10, height:10, borderRadius:"50%", background:col, boxShadow:`0 0 6px ${col}` }}/>
      <span style={{ color:"#475569", fontSize:8, letterSpacing:1 }}>{label}</span>
    </div>
  );
}
