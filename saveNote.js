import { getStore } from "@netlify/blobs";

export default async function handler(req) {
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const { date, playerId, note, kLine, isLock } = body;

      if (!date || !playerId) {
        return new Response("Missing required fields", { status: 400 });
      }

      const store = getStore("pitcher-notes");
      const key = `${date}:${playerId}`;
      await store.setJSON(key, {
        date, playerId, note, kLine, isLock,
        savedAt: new Date().toISOString()
      });

      return new Response(JSON.stringify({ ok: true }), {
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

  if (req.method === "GET") {
    try {
      const url = new URL(req.url);
      const date = url.searchParams.get("date");
      const store = getStore("pitcher-notes");

      const { blobs } = date
        ? await store.list({ prefix: `${date}:` })
        : await store.list();

      const notes = await Promise.all(
        blobs.map(async (blob) => {
          const data = await store.getJSON(blob.key);
          return data;
        })
      );

      return new Response(JSON.stringify({ notes: notes.filter(Boolean) }), {
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

  return new Response("Method not allowed", { status: 405 });
}

export const config = { path: "/api/saveNote" };
