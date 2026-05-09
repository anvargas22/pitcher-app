// ─── GRADE HELPERS ───────────────────────────────────────────────────────
export function gradeK(k)   { return k>=25?"green":k>=20?"yellow":"red"; }
export function gradeOpp(k) { return k>=22?"green":k>=18?"yellow":"red"; }
export function gradeBB(pct){ return pct>=9?"green":pct>=6?"yellow":"red"; }
export function gradeOuts(avg, hitRate) {
  if (avg>=18 && hitRate>=67) return "green";
  if (avg>=15 && hitRate>=33) return "yellow";
  return "red";
}
export function combinedKGrade(pg, og) {
  if (pg==="green"  && og==="green")  return "⭐⭐ ELITE";
  if (pg==="green"  && og==="yellow") return "✅ STRONG";
  if (pg==="yellow" && og==="green")  return "✅ LEAN";
  if (pg==="green"  && og==="red")    return "⚠️ CAUTION";
  if (pg==="yellow" && og==="yellow") return "🟡 NEUTRAL";
  if (pg==="yellow" && og==="red")    return "⚠️ CAUTION";
  return "❌ FADE";
}
export const gradeScore = g => ({"⭐⭐ ELITE":5,"✅ STRONG":4,"✅ LEAN":3,"⚠️ CAUTION":2,"🟡 NEUTRAL":1,"❌ FADE":0})[g]??0;

export const GRADE_COLORS = {
  "⭐⭐ ELITE":"#22c55e","✅ STRONG":"#4ade80","✅ LEAN":"#86efac",
  "⚠️ CAUTION":"#eab308","🟡 NEUTRAL":"#ca8a04","❌ FADE":"#ef4444",
};

export const PILL_COLORS = {
  green: "#16a34a",
  yellow: "#ca8a04",
  red: "#dc2626",
};
