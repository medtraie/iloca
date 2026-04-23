import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let body: any = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
      }
    }
    const companyId = body?.company_id;

    let data: any = null;
    if (companyId) {
      const r = await sb
        .from("gpswox_settings")
        .select("api_url, email, password")
        .eq("company_id", companyId)
        .limit(1)
        .maybeSingle();
      data = r.data;
    }

    if (!data) {
      const r = await sb
        .from("gpswox_settings")
        .select("api_url, email, password")
        .is("company_id", null)
        .limit(1)
        .maybeSingle();
      data = r.data;
    }

    const settings = {
      api_url: data?.api_url || Deno.env.get("GPSWOX_API_URL") || "",
      email: data?.email || Deno.env.get("GPSWOX_EMAIL") || "",
      password: data?.password || Deno.env.get("GPSWOX_PASSWORD") || ""
    };

    return new Response(JSON.stringify({ ok: true, settings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
