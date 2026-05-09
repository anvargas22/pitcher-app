import { getStore } from "@netlify/blobs";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    const { date, playerId, result } = body;

    if (!date || !playerId || !result) {
      return new Response("Missing required fields", { status: 400 });
    }

    const store = getStore("pitcher-results");
    const key = `${date}:${playerId}`;
    await store.setJSON(key, { date, playerId, result, savedAt: new Date().toISOString() });

    return new Response(JSON.stringify({ ok: true, key }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const config = { path: "/api/saveResult" };
