// supabase/functions/clear-attendance/index.ts
// Deletes a PRESENT mark to revert student to NOT MARKED before submission.
// Access: faculty/HOD/Admin for sessions they own/teach; service role key used.
// Notes: does not create ABSENT rows; simply deletes the mark.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const { attendance_id } = await req.json();
    if (!attendance_id) {
      return new Response(
        JSON.stringify({ error: "attendance_id is required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response("Invalid user", { status: 401, headers: corsHeaders });
    }

    const userId = userData.user.id;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (!profile || !["FACULTY", "ADMIN", "HOD"].includes(profile.role)) {
      return new Response("Not allowed", { status: 403, headers: corsHeaders });
    }

    // Get attendance row with session & class for authorization
    const { data: mark, error: markError } = await supabaseAdmin
      .from("attendance_marks")
      .select("id, student_id, session_id, class_id")
      .eq("id", attendance_id)
      .maybeSingle();

    if (markError || !mark) {
      return new Response(
        JSON.stringify({ error: "Attendance record not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Check session is still ACTIVE
    const { data: session } = await supabaseAdmin
      .from("sessions")
      .select("id, class_id, status")
      .eq("id", mark.session_id)
      .maybeSingle();

    if (!session) {
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (session.status !== "ACTIVE") {
      return new Response(
        JSON.stringify({ error: "Session is locked" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Authorization: faculty must own/teach the class of the session (or admin/hod)
    if (!["ADMIN", "HOD"].includes(profile.role)) {
      const { data: mapping } = await supabaseAdmin
        .from("class_faculty")
        .select("id")
        .eq("class_id", session.class_id)
        .eq("faculty_id", userId)
        .maybeSingle();

      if (!mapping) {
        return new Response("Not allowed", { status: 403, headers: corsHeaders });
      }
    }

    // Delete the mark to revert to NOT MARKED
    const { error: deleteError } = await supabaseAdmin
      .from("attendance_marks")
      .delete()
      .eq("id", attendance_id);

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
