const BASE = "https://statsapi.mlb.com/api/v1";

export const TEAM_ID_TO_ABB = {
  133:"ATH",134:"PIT",135:"SD",136:"SEA",137:"SF",
  138:"STL",139:"TB",140:"TEX",141:"TOR",142:"MIN",
  143:"PHI",144:"ATL",145:"CWS",146:"MIA",147:"NYY",
  158:"MIL",108:"LAA",109:"AZ",110:"BAL",111:"BOS",
  112:"CHC",113:"CIN",114:"CLE",115:"COL",116:"DET",
  117:"HOU",118:"KC",119:"LAD",120:"WSH",121:"NYM",
};

export const ABB_TO_TEAM_ID = Object.fromEntries(
  Object.entries(TEAM_ID_TO_ABB).map(([id,abb]) => [abb, parseInt(id)])
);

export const STADIUM_COORDS = {
  NYY:{lat:40.8296,lon:-73.9262,name:"Yankee Stadium"},
  BOS:{lat:42.3467,lon:-71.0972,name:"Fenway Park"},
  TB: {lat:27.7683,lon:-82.6534,name:"Tropicana Field",indoor:true},
  TOR:{lat:43.6414,lon:-79.3894,name:"Rogers Centre",indoor:true},
  BAL:{lat:39.2838,lon:-76.6216,name:"Camden Yards"},
  CWS:{lat:41.8300,lon:-87.6338,name:"Guaranteed Rate"},
  CLE:{lat:41.4962,lon:-81.6852,name:"Progressive Field"},
  DET:{lat:42.3390,lon:-83.0485,name:"Comerica Park"},
  KC: {lat:39.0517,lon:-94.4803,name:"Kauffman Stadium"},
  MIN:{lat:44.9817,lon:-93.2776,name:"Target Field"},
  HOU:{lat:29.7573,lon:-95.3555,name:"Minute Maid Park",indoor:true},
  LAA:{lat:33.8003,lon:-117.8827,name:"Angel Stadium"},
  SEA:{lat:47.5914,lon:-122.3325,name:"T-Mobile Park",indoor:true},
  TEX:{lat:32.7473,lon:-97.0822,name:"Globe Life Field",indoor:true},
  ATH:{lat:37.7516,lon:-122.2005,name:"Oakland Coliseum"},
  ATL:{lat:33.8907,lon:-84.4677,name:"Truist Park"},
  MIA:{lat:25.7781,lon:-80.2196,name:"loanDepot park",indoor:true},
  NYM:{lat:40.7571,lon:-73.8458,name:"Citi Field"},
  PHI:{lat:39.9061,lon:-75.1665,name:"Citizens Bank"},
  WSH:{lat:38.8730,lon:-77.0074,name:"Nationals Park"},
  CHC:{lat:41.9484,lon:-87.6553,name:"Wrigley Field"},
  CIN:{lat:39.0979,lon:-84.5082,name:"Great American BP"},
  MIL:{lat:43.0280,lon:-87.9712,name:"American Family Field",indoor:true},
  PIT:{lat:40.4469,lon:-80.0057,name:"PNC Park"},
  STL:{lat:38.6226,lon:-90.1928,name:"Busch Stadium"},
  AZ: {lat:33.4455,lon:-112.0667,name:"Chase Field",indoor:true},
  COL:{lat:39.7559,lon:-104.9942,name:"Coors Field"},
  LAD:{lat:34.0739,lon:-118.2400,name:"Dodger Stadium"},
  SD: {lat:32.7076,lon:-117.1570,name:"Petco Park"},
  SF: {lat:37.7786,lon:-122.3893,name:"Oracle Park"},
};

function fmtDate(d) { return d.toISOString().split("T")[0]; }

// ── 1. Probable pitchers ─────────────────────────────────────────────────
export async function fetchProbablePitchers(date) {
  const url = `${BASE}/schedule?sportId=1&date=${date}&hydrate=probablePitcher,team`;
  const res = await fetch(url);
  const data = await res.json();
  const pitchers = [];
  for (const game of data.dates?.[0]?.games || []) {
    const away = game.teams?.away;
    const home = game.teams?.home;
    const awayAbb = TEAM_ID_TO_ABB[away?.team?.id];
    const homeAbb = TEAM_ID_TO_ABB[home?.team?.id];
    if (away?.probablePitcher) {
      pitchers.push({
        playerId: away.probablePitcher.id,
        name: away.probablePitcher.fullName,
        team: awayAbb, opp: homeAbb,
        oppTeamId: home?.team?.id,
        gameTime: game.gameDate,
        venueTeam: homeAbb,
      });
    }
    if (home?.probablePitcher) {
      pitchers.push({
        playerId: home.probablePitcher.id,
        name: home.probablePitcher.fullName,
        team: homeAbb, opp: awayAbb,
        oppTeamId: away?.team?.id,
        gameTime: game.gameDate,
        venueTeam: homeAbb,
      });
    }
  }
  return pitchers;
}

// ── 2. Season stats ──────────────────────────────────────────────────────
export async function fetchPitcherSeasonStats(playerId) {
  try {
    const year = new Date().getFullYear();
    const url = `${BASE}/people/${playerId}/stats?stats=season&season=${year}&group=pitching`;
    const res = await fetch(url);
    const data = await res.json();
    const s = data.stats?.[0]?.splits?.[0]?.stat;
    if (!s) return null;
    const ip  = parseFloat(s.inningsPitched || 0);
    const bf  = parseFloat(s.battersFaced || 1);
    const so  = parseFloat(s.strikeOuts || 0);
    const bb  = parseFloat(s.baseOnBalls || 0);
    const gs  = Math.max(parseInt(s.gamesStarted || 1), 1);
    return {
      ip, gs, so, bb, bf,
      era:   parseFloat(s.era || 0),
      kPct:  bf > 0 ? Math.round((so/bf)*1000)/10 : 0,
      bbPct: bf > 0 ? Math.round((bb/bf)*1000)/10 : 0,
      bbAvg: Math.round((bb/gs)*10)/10,
    };
  } catch { return null; }
}

// ── 3. Game log → outs + BB + pitch count ───────────────────────────────
export async function fetchPitcherGameLog(playerId, numStarts = 6) {
  try {
    const year = new Date().getFullYear();
    const url = `${BASE}/people/${playerId}/stats?stats=gameLog&season=${year}&group=pitching`;
    const res = await fetch(url);
    const data = await res.json();

    const splits = (data.stats?.[0]?.splits || [])
      .filter(s => parseInt(s.stat?.gamesStarted) === 1)
      .slice(-numStarts);

    if (!splits.length) return null;

    const ipToOuts = ip => {
      const [full, frac="0"] = String(ip).split(".");
      return parseInt(full)*3 + parseInt(frac);
    };

    const outsArr = splits.map(s => ipToOuts(s.stat?.inningsPitched || "0.0"));
    const bbArr   = splits.map(s => parseInt(s.stat?.baseOnBalls || 0));

    // Try multiple possible pitch count field names
    const pcArr = splits.map(s => {
      return parseInt(s.stat?.numberOfPitches || 0) ||
             parseInt(s.stat?.pitchesThrown || 0) ||
             parseInt(s.stat?.pitchCount || 0) || 0;
    }).filter(p => p > 0);

    const avgOuts = Math.round((outsArr.reduce((a,b)=>a+b,0)/outsArr.length)*10)/10;
    const hitRate = Math.round((outsArr.filter(o=>o>17.5).length/outsArr.length)*100);
    const bbAvg   = Math.round((bbArr.reduce((a,b)=>a+b,0)/bbArr.length)*10)/10;

    let avgPC = null, maxPC = null, minPC = null, ipCeiling = null;
    if (pcArr.length >= 2) {
      avgPC     = Math.round(pcArr.reduce((a,b)=>a+b,0)/pcArr.length);
      maxPC     = Math.max(...pcArr);
      minPC     = Math.min(...pcArr);
      ipCeiling = Math.round((avgPC/17)*10)/10;
    }

    const pcTendency = avgPC
      ? (avgPC >= 90 ? "high" : avgPC >= 78 ? "medium" : "low")
      : (avgOuts/3 >= 6 ? "high" : avgOuts/3 >= 5 ? "medium" : "low");

    return {
      avgOuts, hitRate, bbAvg, outsArr, bbArr,
      numStarts: splits.length,
      pcTendency, avgPC, maxPC, minPC, ipCeiling,
      // expose raw splits for debugging
      rawSplits: splits.slice(0,2).map(s => ({
        date: s.date,
        ip: s.stat?.inningsPitched,
        pc: s.stat?.numberOfPitches,
        pitchesThrown: s.stat?.pitchesThrown,
      })),
    };
  } catch { return null; }
}

// ── 4. Opp K% L7 ────────────────────────────────────────────────────────
export async function fetchTeamOppK(teamId) {
  try {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate()-7);
    const year = today.getFullYear();
    const url = `${BASE}/teams/${teamId}/stats?stats=byDateRange&startDate=${fmtDate(weekAgo)}&endDate=${fmtDate(today)}&group=hitting&season=${year}`;
    const res = await fetch(url);
    const data = await res.json();
    const s = data.stats?.[0]?.splits?.[0]?.stat;
    if (!s) return null;
    const so = parseInt(s.strikeOuts || 0);
    const ab = parseInt(s.atBats || 1);
    return ab > 0 ? Math.round((so/ab)*1000)/10 : null;
  } catch { return null; }
}

// ── 5. Injury check ──────────────────────────────────────────────────────
export async function fetchInjuryStatus(playerId) {
  try {
    // Check transactions for IL placements
    const year = new Date().getFullYear();
    const url = `${BASE}/people/${playerId}?hydrate=currentTeam`;
    const res = await fetch(url);
    const data = await res.json();
    const person = data.people?.[0];
    if (!person) return null;

    const isActive = person.active;
    const rosterStatus = person.rosterStatus || "";
    const statusCode = person.status?.code || "";
    const statusDesc = person.status?.description || "";

    console.log(`[Injury] ${person.fullName}: active=${isActive} status="${statusDesc}" code="${statusCode}"`);

    if (!isActive) return { flag:"🚨 NOT ACTIVE", severity:"high" };

    const desc = statusDesc.toLowerCase();
    if (desc.includes("60-day") || desc.includes("60 day")) return { flag:"🚨 60-DAY IL", severity:"high" };
    if (desc.includes("15-day") || desc.includes("15 day") || desc.includes("injured list") || desc.includes(" il")) return { flag:"🚨 IL", severity:"high" };
    if (desc.includes("day-to-day") || desc.includes("day to day")) return { flag:"⚠️ DAY-TO-DAY", severity:"medium" };
    if (statusCode === "DL" || statusCode === "IL") return { flag:"🚨 IL", severity:"high" };

    return null;
  } catch(e) {
    console.log("[Injury] fetch error:", e.message);
    return null;
  }
}

// ── 6. Weather ───────────────────────────────────────────────────────────
export async function fetchWeather(venueTeam, gameTime) {
  try {
    const coords = STADIUM_COORDS[venueTeam];
    if (!coords) return { summary:"🏟️ Stadium N/A", alert:false, isIndoor:false };
    if (coords.indoor) return { summary:`🏟️ ${coords.name} — Indoor`, alert:false, isIndoor:true };

    // Parse game time — MLB API returns UTC
    const gameDate = gameTime ? new Date(gameTime) : new Date();
    const dateStr = fmtDate(gameDate);

    // Get local hour at stadium
    const localHour = gameDate.getUTCHours(); // approximate — good enough for weather

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=temperature_2m,precipitation_probability,windspeed_10m,weathercode&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;

    const res = await fetch(url);
    if (!res.ok) return { summary:"⛅ Weather unavailable", alert:false, isIndoor:false };
    const wdata = await res.json();

    if (!wdata.hourly?.temperature_2m) return { summary:"⛅ Weather unavailable", alert:false, isIndoor:false };

    // Use game time hour, clamped to 0-23
    const idx = Math.min(Math.max(localHour, 0), 23);
    const temp   = Math.round(wdata.hourly.temperature_2m[idx] || 70);
    const precip = wdata.hourly.precipitation_probability[idx] || 0;
    const wind   = Math.round(wdata.hourly.windspeed_10m[idx] || 0);
    const wcode  = wdata.hourly.weathercode[idx] || 0;

    const flags = [];
    if (precip >= 50) flags.push(`🌧️ ${precip}% rain`);
    else if (precip >= 30) flags.push(`🌦️ ${precip}% rain`);
    if (wind >= 15) flags.push(`💨 ${wind}mph`);
    if (temp <= 45) flags.push(`🥶 ${temp}°F`);
    if (wcode >= 95) flags.push("⛈️ Thunderstorm");

    const alert = precip >= 40 || wind >= 15 || temp <= 45 || wcode >= 95;

    return {
      temp, precip, wind, wcode, flags,
      isIndoor: false,
      alert,
      summary: flags.length
        ? flags.join(" · ")
        : `☀️ ${temp}°F · ${wind}mph wind`,
      stadium: coords.name,
    };
  } catch(e) {
    console.log("[Weather] error:", e.message);
    return { summary:"⛅ Weather fetch failed", alert:false, isIndoor:false };
  }
}

// ── 7. Lock suggestions ──────────────────────────────────────────────────
export function suggestLock(row) {
  const suggestions = [];
  const { pitcherK, oppK, bbPct, bbAvg, bbLine, outsAvg, outsHitRate, pcTendency, avgPC } = row;

  // K suggestions
  if (pitcherK >= 25 && oppK >= 22) suggestions.push("⭐⭐ K MORE — ELITE matchup GREEN/GREEN");
  else if (pitcherK >= 25 && oppK >= 18) suggestions.push("✅ K MORE — STRONG matchup GREEN/YELLOW");
  else if (pitcherK >= 20 && oppK >= 22) suggestions.push("✅ K MORE — LEAN matchup YELLOW/GREEN");

  // BB suggestions
  if (bbPct !== undefined) {
    if (bbPct < 4 && bbAvg <= (bbLine || 1.5)) suggestions.push(`🔒 BB LESS ${bbLine || 0.5} — structural (${bbPct}% season)`);
    else if (bbPct >= 9 && bbAvg >= (bbLine || 1.5)) suggestions.push(`🔒 BB MORE ${bbLine || 1.5} — structural (${bbPct}% season)`);
  }

  // Outs suggestions
  if (outsAvg >= 18 && outsHitRate >= 67) suggestions.push("🔒 OUTS MORE — GREEN avg + 67%+ hit rate");
  else if (outsAvg >= 17 && outsHitRate >= 55 && pcTendency === "high") suggestions.push("✅ OUTS MORE lean — borderline + HIGH PC");

  // PC warnings
  if (avgPC && avgPC < 75) suggestions.push("⚠️ LOW avg PC — early hook risk, fade outs");
  if (avgPC && avgPC >= 95) suggestions.push("💪 HIGH avg PC — goes deep consistently");

  return suggestions;
}

// ── 8. Build full row ────────────────────────────────────────────────────
export async function buildPitcherRow(pitcher, date) {
  const { playerId, name, opp, oppTeamId, venueTeam, gameTime } = pitcher;

  const [season, gameLog, oppK, injury, weather] = await Promise.all([
    fetchPitcherSeasonStats(playerId),
    fetchPitcherGameLog(playerId),
    oppTeamId ? fetchTeamOppK(oppTeamId) : Promise.resolve(null),
    fetchInjuryStatus(playerId),
    fetchWeather(venueTeam, gameTime),
  ]);

  if (!season) return null;

  const bbAvg  = gameLog?.bbAvg ?? season.bbAvg;
  const bbLine = season.bbPct < 4 ? 0.5 : 1.5;

  const row = {
    date, pitcher: name, opp, playerId,
    pitcherK:    season.kPct,
    oppK:        oppK ?? 0,
    bbPct:       season.bbPct,
    bbAvg,       bbLine,
    outsAvg:     gameLog?.avgOuts ?? 0,
    outsHitRate: gameLog?.hitRate ?? 0,
    outsLine:    17.5,
    pcTendency:  gameLog?.pcTendency ?? "medium",
    avgPC:       gameLog?.avgPC ?? null,
    maxPC:       gameLog?.maxPC ?? null,
    minPC:       gameLog?.minPC ?? null,
    ipCeiling:   gameLog?.ipCeiling ?? null,
    era:         season.era,
    gs:          season.gs,
    numStarts:   gameLog?.numStarts ?? 0,
    injury:      injury,
    weather:     weather,
    note:        "",
    autoFetched: true,
  };

  row.lockSuggestions = suggestLock(row);
  return row;
}
