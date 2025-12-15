// supabase/functions/attendance-scan/index.ts
// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

serve(async (req) => {
  // ---------- CORS ----------
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const { qr_payload } = await req.json();
    if (!qr_payload) {
      return new Response(
        JSON.stringify({ error: "QR payload missing" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ---- Admin client ----
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ---- Identify student ----
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response("Invalid user", { status: 401, headers: corsHeaders });
    }

    const studentId = user.id;

    // ---- Ensure role = STUDENT ----
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", studentId)
      .single();

    if (!profile || profile.role !== "STUDENT") {
      return new Response("Only students allowed", { status: 403, headers: corsHeaders });
    }

    // ---- Get student record ----
    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id, class_id")
      .eq("id", studentId)
      .single();

    if (!student || !student.class_id) {
      return new Response(
        JSON.stringify({ error: "Student not assigned to any class" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ---- Find session ----
    const { data: session } = await supabaseAdmin
      .from("sessions")
      .select("*")
      .eq("qr_payload", qr_payload)
      .single();

    if (!session) {
      return new Response(
        JSON.stringify({ error: "Invalid QR code" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // ---- Validate session ----
    if (session.status !== "ACTIVE") {
      return new Response(
        JSON.stringify({ error: "Session not active" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (new Date(session.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "QR code expired" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (session.class_id !== student.class_id) {
      return new Response(
        JSON.stringify({ error: "Student not in this class" }),
        { status: 403, headers: corsHeaders }
      );
    }

    // ---- Prevent duplicate attendance ----
    const { data: existing } = await supabaseAdmin
      .from("attendance_marks")
      .select("id")
      .eq("student_id", studentId)
      .eq("session_id", session.id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Attendance already marked",
          message: "You have already marked attendance for this session"
        }),
        { status: 409, headers: corsHeaders }
      );
    }

    // ---- Insert attendance ----
    const { error: insertError } = await supabaseAdmin
      .from("attendance_marks")
      .insert({
        student_id: studentId,
        class_id: student.class_id,
        session_id: session.id,
        status: "PRESENT",
      });

    if (insertError) {
      // Handle race condition with unique (student_id, session_id)
      const isConflict = (insertError as any)?.code === "23505";
      const status = isConflict ? 409 : 400;
      const message = isConflict
        ? "Attendance already marked"
        : insertError.message;
      return new Response(
        JSON.stringify({ success: false, error: message }),
        { status, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Attendance marked successfully",
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
