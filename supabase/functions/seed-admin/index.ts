import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Admin credentials for demo/presentation purposes
// Email: admin@system.local
// Password: Admin123!@#
const ADMIN_EMAIL = "admin@system.local";
const ADMIN_PASSWORD = "Admin123!@#";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role to create admin user
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("Checking if admin user already exists...");

    // Check if admin already exists by email
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      throw listError;
    }

    const adminExists = existingUsers.users.some(
      (user) => user.email === ADMIN_EMAIL
    );

    if (adminExists) {
      console.log("Admin user already exists");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Admin user already exists",
          credentials: {
            email: ADMIN_EMAIL,
            password: "(already set)"
          }
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    console.log("Creating admin user...");

    // Create the admin user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: "System Administrator",
      },
    });

    if (createError) {
      console.error("Error creating admin user:", createError);
      throw createError;
    }

    console.log("Admin user created with ID:", newUser.user.id);

    // The profile is auto-created by the trigger, now update the role to admin
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .update({ role: "admin" })
      .eq("user_id", newUser.user.id);

    if (roleError) {
      console.error("Error updating role:", roleError);
      throw roleError;
    }

    console.log("Admin role assigned successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin user created successfully",
        credentials: {
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        },
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 201 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Seed admin error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
