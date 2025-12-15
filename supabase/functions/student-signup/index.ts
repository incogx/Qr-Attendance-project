// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // ---------- CORS ----------
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ---------- READ BODY ----------
    const body = await req.json();
    console.log("STUDENT SIGNUP BODY:", body);

    const {
      reg_number,
      password,
      full_name,
      class_no,
      department,
      phone,
      section,
    } = body;

    // ---------- VALIDATION ----------
    if (!reg_number) {
      return jsonError("reg_number missing");
    }
    if (!password) {
      return jsonError("password missing");
    }
    if (!full_name) {
      return jsonError("full_name missing");
    }
    if (!class_no) {
      return jsonError("class_no missing");
    }
    if (!department) {
      return jsonError("department missing");
    }

    // ---------- BACKEND EMAIL ----------
    const email = `${reg_number}@attendance.app`;

    // ---------- ADMIN CLIENT ----------
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // ---------- SIGNUP TOGGLE (SAFE) ----------
    const { data: settings, error: settingsError } =
      await supabaseAdmin
        .from("system_settings")
        .select("student_signup_enabled")
        .limit(1)
        .maybeSingle();

    if (settingsError) {
      console.warn("system_settings read error:", settingsError.message);
    }

    // Default to disabled if setting doesn't exist or is explicitly false
    if (!settings || settings.student_signup_enabled !== true) {
      return jsonError("Student signup is currently disabled. Please contact administrator.", 403);
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
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        email,
        full_name,
        role: "STUDENT",
        department,
        phone,
      });

    if (profileError) {
      console.error("Profile insert error:", profileError.message);
      return jsonError(profileError.message);
    }

    // ---------- FIND OR CREATE CLASS ----------
    let classId = null;
    if (class_no) {
      // Try to find existing class
      const { data: existingClass } = await supabaseAdmin
        .from("classes")
        .select("id")
        .eq("class_no", class_no.trim())
        .maybeSingle();

      if (existingClass) {
        classId = existingClass.id;
      } else {
        // Create class if it doesn't exist
        const { data: newClass, error: classError } = await supabaseAdmin
          .from("classes")
          .insert({
            class_no: class_no.trim(),
            department: department || null,
          })
          .select("id")
          .single();

        if (classError) {
          console.error("Class create error:", classError.message);
          // Continue without class_id if class creation fails
        } else {
          classId = newClass.id;
        }
      }
    }

    // ---------- INSERT STUDENT ----------
    const { error: studentError } = await supabaseAdmin
      .from("students")
      .insert({
        id: userId,
        reg_number,
        name: full_name,
        email,
        phone,
        department,
        class_no,
        class_id: classId,
        section,
      });

    if (studentError) {
      console.error("Student insert error:", studentError.message);
      // Rollback: delete auth user and profile
      await supabaseAdmin.auth.admin.deleteUser(userId).catch((err) =>
        console.warn("Rollback delete failed:", err)
      );
      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", userId)
        .catch((err) => console.warn("Rollback profile delete failed:", err));
      return jsonError(studentError.message);
    }

    // ---------- SUCCESS ----------
    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
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
    console.error("student-signup fatal error:", err);
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
