// Validates QR token scans and marks attendance. All checks are server-side to prevent replay/photo reuse.
// Steps: verify signature, expiry, session status, class membership, dedupe, mark token used, insert attendance, log outcome.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
  "Content-Type": "application/json",
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const fromBase64Url = (value: string) =>
  Uint8Array.from(
    atob(value.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );

const hmacSign = async (message: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return toBase64Url(new Uint8Array(signature));
};

const sha256Base64Url = async (message: string) => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(message));
  return toBase64Url(new Uint8Array(digest));
};

const parseClientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const signingSecret = Deno.env.get("QR_SIGNING_SECRET");

  if (!signingSecret) {
    return new Response(
      JSON.stringify({ error: "Missing QR_SIGNING_SECRET" }),
      { status: 500, headers: corsHeaders },
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const logAttempt = async (
    sessionId: string,
    studentId: string | null,
    tokenHash: string | null,
    status: "SUCCESS" | "REJECTED",
    reason: string,
    ip: string | null,
    device_fingerprint: string | null,
    userAgent: string | null,
  ) => {
    await supabaseAdmin.from("scan_logs").insert({
      session_id: sessionId,
      student_id: studentId,
      token_hash: tokenHash,
      status,
      reason,
      ip_address: ip,
      device_fingerprint,
      user_agent: userAgent,
    });
  };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const { token, device_fingerprint } = await req.json();
    if (!token) {
      return new Response(
        JSON.stringify({ error: "token is required" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const ip = parseClientIp(req);
    const userAgent = req.headers.get("user-agent");

    const parts = token.split(".");
    if (parts.length !== 2) {
      return new Response(
        JSON.stringify({ error: "Invalid token format" }),
        { status: 400, headers: corsHeaders },
      );
    }

    let payloadJson = "";
    let payload: any;
    try {
      payloadJson = decoder.decode(fromBase64Url(parts[0]));
      payload = JSON.parse(payloadJson);
    } catch (_err) {
      return new Response(
        JSON.stringify({ error: "Malformed token payload" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const { session_id, nonce, issued_at, expires_at } = payload;
    if (!session_id || !nonce || !issued_at || !expires_at) {
      return new Response(
        JSON.stringify({ error: "Token missing fields" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const expectedSignature = await hmacSign(payloadJson, signingSecret);
    if (expectedSignature !== parts[1]) {
      await logAttempt(session_id, null, null, "REJECTED", "Signature mismatch", ip, device_fingerprint ?? null, userAgent);
      return new Response(
        JSON.stringify({ error: "Invalid token signature" }),
        { status: 401, headers: corsHeaders },
      );
    }

    const now = new Date();
    if (new Date(expires_at) <= now || new Date(issued_at) > now) {
      await logAttempt(session_id, null, null, "REJECTED", "Token expired or not yet valid", ip, device_fingerprint ?? null, userAgent);
      return new Response(
        JSON.stringify({ error: "Token expired" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const tokenHash = await sha256Base64Url(token);

    const { data: tokenRow } = await supabaseAdmin
      .from("qr_tokens")
      .select("session_id, used_at, used_by, expires_at, status")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (!tokenRow) {
      await logAttempt(session_id, null, tokenHash, "REJECTED", "Unknown token", ip, device_fingerprint ?? null, userAgent);
      return new Response(
        JSON.stringify({ error: "Unknown or revoked token" }),
        { status: 404, headers: corsHeaders },
      );
    }

    if (tokenRow.session_id !== session_id) {
      await logAttempt(session_id, null, tokenHash, "REJECTED", "Session mismatch", ip, device_fingerprint ?? null, userAgent);
      return new Response(
        JSON.stringify({ error: "Token-session mismatch" }),
        { status: 400, headers: corsHeaders },
      );
    }

    if (tokenRow.used_at || tokenRow.status === "USED") {
      await logAttempt(session_id, tokenRow.used_by ?? null, tokenHash, "REJECTED", "Token already used", ip, device_fingerprint ?? null, userAgent);
      return new Response(
        JSON.stringify({ error: "Token already used" }),
        { status: 409, headers: corsHeaders },
      );
    }

    if (new Date(tokenRow.expires_at) <= now) {
      await logAttempt(session_id, null, tokenHash, "REJECTED", "Token expired", ip, device_fingerprint ?? null, userAgent);
      await supabaseAdmin
        .from("qr_tokens")
        .update({ status: "EXPIRED" })
        .eq("token_hash", tokenHash);
      return new Response(
        JSON.stringify({ error: "Token expired" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const bearer = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(bearer);
    if (userError || !userData?.user) {
      return new Response("Invalid user", { status: 401, headers: corsHeaders });
    }

    const studentId = userData.user.id;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", studentId)
      .maybeSingle();

    if (!profile || profile.role !== "STUDENT") {
      await logAttempt(session_id, studentId, tokenHash, "REJECTED", "Role not student", ip, device_fingerprint ?? null, userAgent);
      return new Response("Only students allowed", { status: 403, headers: corsHeaders });
    }

    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id, class_id")
      .eq("id", studentId)
      .maybeSingle();

    if (!student?.class_id) {
      await logAttempt(session_id, studentId, tokenHash, "REJECTED", "Student missing class", ip, device_fingerprint ?? null, userAgent);
      return new Response(
        JSON.stringify({ error: "Student not assigned to class" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const { data: session } = await supabaseAdmin
      .from("attendance_sessions")
      .select("id, class_id, status, expires_at")
      .eq("id", session_id)
      .maybeSingle();

    if (!session) {
      await logAttempt(session_id, studentId, tokenHash, "REJECTED", "Session not found", ip, device_fingerprint ?? null, userAgent);
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        { status: 404, headers: corsHeaders },
      );
    }

    if (session.status !== "ACTIVE" || new Date(session.expires_at) <= now) {
      await logAttempt(session_id, studentId, tokenHash, "REJECTED", "Session inactive", ip, device_fingerprint ?? null, userAgent);
      return new Response(
        JSON.stringify({ error: "Session inactive" }),
        { status: 400, headers: corsHeaders },
      );
    }

    if (session.class_id !== student.class_id) {
      await logAttempt(session_id, studentId, tokenHash, "REJECTED", "Cross-class attempt", ip, device_fingerprint ?? null, userAgent);
      return new Response(
        JSON.stringify({ error: "Student not in this class" }),
        { status: 403, headers: corsHeaders },
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("attendance_marks")
      .select("id")
      .eq("student_id", studentId)
      .eq("session_id", session_id)
      .maybeSingle();

    if (existing) {
      await logAttempt(session_id, studentId, tokenHash, "REJECTED", "Duplicate scan", ip, device_fingerprint ?? null, userAgent);
      return new Response(
        JSON.stringify({ error: "Attendance already marked" }),
        { status: 409, headers: corsHeaders },
      );
    }

    const { data: tokenUpdate, error: tokenUpdateError } = await supabaseAdmin
      .from("qr_tokens")
      .update({
        status: "USED",
        used_at: new Date().toISOString(),
        used_by: studentId,
        ip_address: ip,
        device_fingerprint: device_fingerprint ?? null,
      })
      .eq("token_hash", tokenHash)
      .is("used_at", null)
      .select("id")
      .maybeSingle();

    if (tokenUpdateError || !tokenUpdate) {
      await logAttempt(session_id, studentId, tokenHash, "REJECTED", "Token already consumed", ip, device_fingerprint ?? null, userAgent);
      return new Response(
        JSON.stringify({ error: "Token already consumed" }),
        { status: 409, headers: corsHeaders },
      );
    }

    const { error: insertError } = await supabaseAdmin.from("attendance_marks").insert({
      student_id: studentId,
      class_id: student.class_id,
      session_id,
      status: "PRESENT",
      token_hash: tokenHash,
      source: "QR",
      device_fingerprint: device_fingerprint ?? null,
      ip_address: ip,
      user_agent: userAgent,
    });

    if (insertError) {
      const isConflict = (insertError as any)?.code === "23505";
      const message = isConflict ? "Attendance already marked" : insertError.message;
      await logAttempt(session_id, studentId, tokenHash, "REJECTED", message, ip, device_fingerprint ?? null, userAgent);
      return new Response(
        JSON.stringify({ error: message }),
        { status: isConflict ? 409 : 400, headers: corsHeaders },
      );
    }

    await logAttempt(session_id, studentId, tokenHash, "SUCCESS", "Scan accepted", ip, device_fingerprint ?? null, userAgent);

    return new Response(
      JSON.stringify({ success: true, message: "Attendance marked" }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    console.error("validate-qr-scan error", err);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: corsHeaders },
    );
  }
});
