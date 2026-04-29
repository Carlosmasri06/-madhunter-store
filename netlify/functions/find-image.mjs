export default async (req) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers });

  let name, category;
  try {
    const body = await req.json();
    name = body.name;
    category = body.category || "otros";
  } catch {
    return new Response(JSON.stringify({ imageUrl: null }), { status: 200, headers });
  }

  if (!name) return new Response(JSON.stringify({ imageUrl: null }), { status: 200, headers });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return new Response(JSON.stringify({ imageUrl: null, error: "No API key" }), { status: 200, headers });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{
          role: "user",
          content: `Find a product image for: "${name}". Return ONLY the direct image URL ending in .jpg .png or .webp. Nothing else.`
        }]
      })
    });

    const data = await response.json();
    let imageUrl = null;

    for (const block of (data.content || [])) {
      if (block.type === "text") {
        const m = block.text.match(/https?:\/\/[^\s<>"']+\.(?:jpg|jpeg|png|webp)(?:\?[^\s]*)?/i);
        if (m) { imageUrl = m[0].replace(/[,.)>]+$/, ""); break; }
        const m2 = block.text.match(/https?:\/\/[^\s<>"']+/);
        if (m2 && !imageUrl) imageUrl = m2[0].replace(/[,.)>]+$/, "");
      }
    }

    return new Response(JSON.stringify({ imageUrl }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ imageUrl: null, error: err.message }), { status: 200, headers });
  }
};

export const config = { path: "/api/find-image" };
