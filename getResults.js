import { getStore } from "@netlify/blobs";

export default async function handler(req) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");

  try {
    const store = getStore("pitcher-results");

    if (date) {
      // Get all results for a specific date
      const { blobs } = await store.list({ prefix: `${date}:` });
      const results = await Promise.all(
        blobs.map(async (blob) => {
          const data = await store.getJSON(blob.key);
          return data;
        })
      );
      return new Response(JSON.stringify({ results: results.filter(Boolean) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      // Get all results
      const { blobs } = await store.list();
      const results = await Promise.all(
        blobs.map(async (blob) => {
          const data = await store.getJSON(blob.key);
          return data;
        })
      );
      return new Response(JSON.stringify({ results: results.filter(Boolean) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const config = { path: "/api/getResults" };
