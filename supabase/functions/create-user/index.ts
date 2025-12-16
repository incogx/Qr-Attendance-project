// supabase/functions/create-user/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ---------- AUTH CHECK ----------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError("Unauthorized", 401);
    }

    const token = authHeader.replace("Bearer ", "");

    // ---------- ADMIN CLIENT ----------
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // ---------- VERIFY USER IS ADMIN ----------
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      return jsonError(`Invalid user: ${userError?.message || "No user found"}`, 401);
    }

    // Check if user is ADMIN
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return jsonError(`Profile error: ${profileError.message}`, 403);
    }

    if (!profile || profile.role !== "ADMIN") {
      return jsonError("Only admins can create users", 403);
    }

    // ---------- READ BODY ----------
    const body = await req.json();
    const {
      email,
      full_name,
      role,
      department,
      phone,
      password,
    } = body;

    // ---------- VALIDATION ----------
    if (!email) {
      return jsonError("email missing");
    }
    if (!full_name) {
      return jsonError("full_name missing");
    }
    if (!role || !["HOD", "FACULTY"].includes(role)) {
      return jsonError("role must be HOD or FACULTY");
    }
    if (!password) {
      return jsonError("password missing");
    }

    // ---------- CHECK IF USER EXISTS ----------
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return jsonError("User with this email already exists", 409);
    }

    // ---------- CREATE AUTH USER ----------
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      console.error("Auth create error:", authError.message);
      return jsonError(authError.message);
    }

    const userId = authData.user.id;

    // ---------- INSERT PROFILE ----------
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        email,
        full_name,
        role: role.toUpperCase(),
        department: department || null,
        phone: phone || null,
      })
      .select()
      .single();

    if (profileError) {
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(userId).catch((err) =>
        console.warn("Rollback delete failed:", err)
      );
      return jsonError(profileError.message);
    }

    // ---------- SUCCESS ----------
    return new Response(
      JSON.stringify({
        success: true,
        profile: profileData,
        user: authData.user,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("create-user fatal error:", err);
    return jsonError("Internal server error", 500);
  }
});

// ---------- HELPERS ----------
function jsonError(message: string, status = 400) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}

