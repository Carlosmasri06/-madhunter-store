import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async (req) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers });

  let name, category;
  try {
    const body = await req.json();
    name = body.name;
    category = body.category || "otros";
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers });
  }

  if (!name) return new Response(JSON.stringify({ imageUrl: null }), { status: 200, headers });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{
        role: "user",
        content: `Find a product image for: "${name}". Search and return ONLY the direct image URL (must end in .jpg .jpeg .png or .webp). No explanation, just the URL.`
      }]
    });

    let imageUrl = null;
    for (const block of (response.content || [])) {
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
