// supabase/functions/hod-approval/index.ts
// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // ---------- CORS ----------
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { approval_id, action, comments } = await req.json();

    if (!approval_id || !["APPROVED", "REJECTED"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "approval_id and valid action required" }),
        { status: 400 }
      );
    }

    // ---- Admin client ----
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ---- Identify user ----
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response("Invalid user", { status: 401 });
    }

    const userId = user.id;

    // ---- Role check (HOD only) ----
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!profile || profile.role !== "HOD") {
      return new Response("Only HOD can approve", { status: 403 });
    }

    // ---- Get approval record ----
    const { data: approval } = await supabaseAdmin
      .from("approvals")
      .select("*")
      .eq("id", approval_id)
      .single();

    if (!approval) {
      return new Response(
        JSON.stringify({ error: "Approval not found" }),
        { status: 404 }
      );
    }

    if (approval.status !== "PENDING") {
      return new Response(
        JSON.stringify({ error: "Already processed" }),
        { status: 400 }
      );
    }

    // ---- Update approval ----
    await supabaseAdmin
      .from("approvals")
      .update({
        status: action,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        comments: comments ?? null,
      })
      .eq("id", approval_id);

    // ---- Update session status ----
    await supabaseAdmin
      .from("sessions")
      .update({
        status: action === "APPROVED" ? "APPROVED" : "REJECTED",
      })
      .eq("id", approval.session_id);

    // ---- If approved, notify admins with only ABSENT students ----
    if (action === "APPROVED") {
      // Get absentees for this session
      const { data: absentees } = await supabaseAdmin
        .from("attendance_marks")
        .select("student_id, students(roll_number,name)")
        .eq("session_id", approval.session_id)
        .eq("status", "ABSENT");

      // Find admin users
      const { data: admins } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("role", "ADMIN");

      const count = absentees?.length ?? 0;
      if (admins && admins.length > 0 && count > 0) {
        const names = (absentees || [])
          .map((a: any) => a.students?.roll_number || a.students?.name || a.student_id)
          .filter(Boolean)
          .slice(0, 20)
          .join(", ");

        const title = `Absentees for approved session`;
        const message = count > 20
          ? `Total absentees: ${count}. Sample: ${names}...`
          : `Total absentees: ${count}. ${names}`;

        // Insert notifications for each admin (bulk insert)
        const rows = admins.map((ad: any) => ({ user_id: ad.id, title, message }));
        if (rows.length > 0) {
          await supabaseAdmin.from("notifications").insert(rows);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Session ${action.toLowerCase()}`,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500 }
    );
  }
});
