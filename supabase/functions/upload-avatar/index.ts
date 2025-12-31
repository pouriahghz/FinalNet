// Backend Function: upload-avatar
// Uploads a cropped avatar image via POST to avoid networks/proxies that block PUT/PATCH.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type UploadAvatarBody = {
  imageBase64: string; // base64 without data: prefix
  contentType?: string; // e.g. image/jpeg
};

function base64ToUint8Array(base64: string) {
  const binStr = atob(base64);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
  return bytes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Validate user JWT
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

    const body = (await req.json()) as UploadAvatarBody;
    const base64 = typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";

    if (!base64) {
      return new Response(JSON.stringify({ error: "Missing image" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Simple size guard (base64 is ~33% larger than bytes). Limit ~1.5MB base64.
    if (base64.length > 1_500_000) {
      return new Response(JSON.stringify({ error: "Image too large" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const contentType = typeof body.contentType === "string" && body.contentType.length > 0 ? body.contentType : "image/jpeg";

    const bytes = base64ToUint8Array(base64);
    const filePath = `${user.id}/avatar.jpg`;

    const supabaseAdmin = createClient(url, serviceKey);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(filePath, bytes, { upsert: true, contentType });

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: urlData } = supabaseAdmin.storage.from("avatars").getPublicUrl(filePath);
    const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { data: profile, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ profile_image_url: imageUrl })
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ profile }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
