// supabase/functions/submit-approval/index.ts
// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
  "Content-Type": "application/json",
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

    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(
        JSON.stringify({ error: "session_id is required" }),
        { status: 400, headers: corsHeaders }
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
      return new Response("Invalid user", { status: 401, headers: corsHeaders });
    }

    const userId = user.id;

    // ---- Role check ----
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!profile || !["FACULTY", "ADMIN"].includes(profile.role)) {
      return new Response("Not allowed", { status: 403, headers: corsHeaders });
    }

    // ---- Get session ----
    const { data: session } = await supabaseAdmin
      .from("sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (!session) {
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (session.status !== "ACTIVE") {
      return new Response(
        JSON.stringify({ error: "Session already submitted or closed" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ---- Prevent duplicate approval submission ----
    const { data: existing } = await supabaseAdmin
      .from("approvals")
      .select("id")
      .eq("session_id", session_id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Session already submitted" }),
        { status: 409, headers: corsHeaders }
      );
    }

    // ---- Update session status ----
    await supabaseAdmin
      .from("sessions")
      .update({ status: "SUBMITTED" })
      .eq("id", session_id);

    // ---- Insert approval record ----
    const { error: approvalError } = await supabaseAdmin
      .from("approvals")
      .insert({
        session_id,
        submitted_by: userId,
        status: "PENDING",
      });

    if (approvalError) {
      return new Response(
        JSON.stringify({ error: approvalError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Session submitted for HOD approval",
      }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
