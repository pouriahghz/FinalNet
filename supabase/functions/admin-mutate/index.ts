// Backend Function: admin-mutate
// Centralizes admin mutations behind POST requests (avoids PATCH blocked by some networks/proxies)

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action =
  | "create_server"
  | "update_server"
  | "delete_server"
  | "update_reservation_status"
  | "assign_credentials";

type Body = {
  action: Action;
  payload: Record<string, unknown>;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authHeader = req.headers.get("authorization") ?? "";

    const supabaseAuth = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser();

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(url, serviceKey);

    // Verify admin role
    const { data: isAdmin, error: roleErr } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = (await req.json()) as Body;
    const { action, payload } = body;

    if (!action || typeof action !== "string") {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "create_server") {
      const server = {
        name: String(payload.name ?? "").trim().slice(0, 120),
        cpu_model: String(payload.cpu_model ?? "").trim().slice(0, 200),
        gpu_model: String(payload.gpu_model ?? "").trim().slice(0, 200),
        os_name: String(payload.os_name ?? "").trim().slice(0, 120),
        ram_gb: Number(payload.ram_gb ?? 0),
        storage_gb: Number(payload.storage_gb ?? 0),
        hourly_price: Number(payload.hourly_price ?? 0),
        daily_price: Number(payload.daily_price ?? 0),
        is_active: Boolean(payload.is_active ?? true),
      };

      const { data, error } = await supabaseAdmin.from("servers").insert(server).select("*").single();
      if (error) throw error;
      return new Response(JSON.stringify({ server: data }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "update_server") {
      const id = String(payload.id ?? "");
      if (!id) throw new Error("Missing server id");

      const updates: Record<string, unknown> = { ...payload };
      delete updates.id;

      const { data, error } = await supabaseAdmin.from("servers").update(updates).eq("id", id).select("*").single();
      if (error) throw error;
      return new Response(JSON.stringify({ server: data }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "delete_server") {
      const id = String(payload.id ?? "");
      if (!id) throw new Error("Missing server id");

      const { error } = await supabaseAdmin.from("servers").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "update_reservation_status") {
      const id = String(payload.id ?? "");
      const status = String(payload.status ?? "");
      if (!id || !status) throw new Error("Missing id/status");

      const { data, error } = await supabaseAdmin
        .from("reservations")
        .update({ status })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ reservation: data }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "assign_credentials") {
      const reservation_id = String(payload.reservation_id ?? "");
      if (!reservation_id) throw new Error("Missing reservation_id");

      const ip_address = String(payload.ip_address ?? "").trim().slice(0, 100);
      const username = String(payload.username ?? "").trim().slice(0, 100);
      const password = String(payload.password ?? "").trim().slice(0, 200);

      const { data: existing, error: existingErr } = await supabaseAdmin
        .from("credentials")
        .select("id")
        .eq("reservation_id", reservation_id)
        .maybeSingle();
      if (existingErr) throw existingErr;

      if (existing) {
        const { data, error } = await supabaseAdmin
          .from("credentials")
          .update({ ip_address, username, password })
          .eq("reservation_id", reservation_id)
          .select("*")
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ credentials: data }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const { data, error } = await supabaseAdmin
        .from("credentials")
        .insert({ reservation_id, ip_address, username, password })
        .select("*")
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ credentials: data }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
