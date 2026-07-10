const AUTH_HASH = "42376098903967b69e12b34d78c53b4bb60322b9d756da07bb57441208782262";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${AUTH_HASH}`) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/backup") {
      if (request.method === "POST") {
        try {
          const body = await request.text();
          await env.LEDGER_BACKUPS.put("master_backup", body);
          return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
      }

      if (request.method === "GET") {
        try {
          const data = await env.LEDGER_BACKUPS.get("master_backup");
          if (!data) return new Response(JSON.stringify({ error: "No backup found" }), { status: 404, headers: corsHeaders });
          return new Response(data, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch(err) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};
