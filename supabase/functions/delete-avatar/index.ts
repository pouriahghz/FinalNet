// Backend Function: delete-avatar
// Deletes user's avatar from storage and resets profile_image_url

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!url || !anonKey || !serviceKey) {
      console.error("Missing environment variables");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authHeader = req.headers.get("authorization") ?? "";

    // Validate user JWT
    const supabaseAuth = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser();

    if (userErr || !user) {
      console.error("Auth error:", userErr?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Deleting avatar for user:", user.id);

    const supabaseAdmin = createClient(url, serviceKey);
    const filePath = `${user.id}/avatar.jpg`;

    // Delete from storage (ignore error if file doesn't exist)
    const { error: deleteError } = await supabaseAdmin.storage
      .from("avatars")
      .remove([filePath]);

    if (deleteError) {
      console.log("Storage delete warning (may not exist):", deleteError.message);
    }

    // Reset profile image URL to null
    const { data: profile, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ profile_image_url: null })
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Profile update error:", updateError.message);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Avatar deleted successfully");
    return new Response(JSON.stringify({ profile }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
