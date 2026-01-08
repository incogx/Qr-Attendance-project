// supabase/functions/start-session/index.ts
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  // -------- CORS --------
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { 
        status: 401,
        headers: corsHeaders 
      });
    }

    const body = await req.json();
    const class_no = String(body.class_no).trim(); // ✅ FORCE STRING
    const expires_in_minutes = body.expires_in_minutes ?? 5;

    if (!class_no) {
      return new Response(
        JSON.stringify({ error: "class_no is required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ---- Admin client ----
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // ---- Get user from JWT ----
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response("Invalid user", { 
        status: 401,
        headers: corsHeaders 
      });
    }

    const userId = user.id;

    // ---- Get role ----
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, department")
      .eq("id", userId)
      .single();

    if (profileError || !["FACULTY", "HOD", "ADMIN"].includes(profile.role)) {
      return new Response("Not allowed", { 
        status: 403,
        headers: corsHeaders 
      });
    }

    // ---- CHECK STUDENTS EXIST (CRITICAL) ----
    const { data: students } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("class_no", class_no);

    if (!students || students.length === 0) {
      return new Response(
        JSON.stringify({ error: `No students found for class ${class_no}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ---- Find or create class ----
    let { data: classRow } = await supabaseAdmin
      .from("classes")
      .select("*")
      .eq("class_no", class_no)
      .maybeSingle();

    if (!classRow) {
      const { data: newClass, error } = await supabaseAdmin
        .from("classes")
        .insert({
          class_no,
          department: profile.department,
        })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      classRow = newClass;
    }

    // ---- Faculty assignment ----
    await supabaseAdmin.from("class_faculty").upsert({
      class_id: classRow.id,
      faculty_id: userId,
    });

    // ---- Assign students to class_id ----
    await supabaseAdmin
      .from("students")
      .update({ class_id: classRow.id })
      .eq("class_no", class_no);

    // ---- Create session ----
    const expiresAt = new Date(
      Date.now() + expires_in_minutes * 60 * 1000
    ).toISOString();

    const qrPayload = `SESSION:${crypto.randomUUID()}`; // seed only; live tokens are per 3s via generate-qr-token

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("attendance_sessions")
      .insert({
        class_id: classRow.id,
        qr_payload: qrPayload,
        expires_at: expiresAt,
        created_by: userId,
        qr_rotation_seconds: 5,
      })
      .select()
      .single();

    if (sessionError) {
      return new Response(
        JSON.stringify({ error: sessionError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        session_id: session.id,
        class_no,
        qr_payload: qrPayload,
        expires_at: expiresAt,
        qr_rotation_seconds: 5,
      }),
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("start-session error:", err);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
