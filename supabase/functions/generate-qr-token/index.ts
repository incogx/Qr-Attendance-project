// Generates a short-lived signed QR token for a session. Tokens expire in 3 seconds and are stored only as hashes.
// Access: faculty/HOD/Admin for sessions they own/teach; service role key used to bypass RLS.

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

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

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

const randomNonce = () => crypto.randomUUID();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const { session_id, device_fingerprint } = await req.json();
    if (!session_id) {
      return new Response(
        JSON.stringify({ error: "session_id is required" }),
        { status: 400, headers: corsHeaders },
      );
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

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response("Invalid user", { status: 401, headers: corsHeaders });
    }

    const userId = userData.user.id;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role, department")
      .eq("id", userId)
      .maybeSingle();

    if (!profile || !["FACULTY", "HOD", "ADMIN"].includes(profile.role)) {
      return new Response("Not allowed", { status: 403, headers: corsHeaders });
    }

    const { data: session } = await supabaseAdmin
      .from("attendance_sessions")
      .select("id, class_id, status, expires_at, qr_rotation_seconds")
      .eq("id", session_id)
      .maybeSingle();

    if (!session) {
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        { status: 404, headers: corsHeaders },
      );
    }

    if (session.status !== "ACTIVE") {
      return new Response(
        JSON.stringify({ error: "Session is locked" }),
        { status: 400, headers: corsHeaders },
      );
    }

    if (new Date(session.expires_at) <= new Date()) {
      return new Response(
        JSON.stringify({ error: "Session expired" }),
        { status: 400, headers: corsHeaders },
      );
    }

    if (!profile || !["ADMIN", "HOD"].includes(profile.role)) {
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

    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 5000); // 5 seconds

    const payload = {
      session_id,
      nonce: randomNonce(),
      issued_at: issuedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    const payloadJson = JSON.stringify(payload);
    const payloadB64 = toBase64Url(encoder.encode(payloadJson));
    const signature = await hmacSign(payloadJson, signingSecret);
    const tokenStr = `${payloadB64}.${signature}`;
    const tokenHash = await sha256Base64Url(tokenStr);

    const { error: insertError } = await supabaseAdmin.from("qr_tokens").insert({
      session_id,
      token_hash: tokenHash,
      nonce: payload.nonce,
      issued_at: payload.issued_at,
      expires_at: payload.expires_at,
      device_fingerprint: device_fingerprint ?? null,
      status: "ISSUED",
    });

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 400, headers: corsHeaders },
      );
    }

    await supabaseAdmin
      .from("attendance_sessions")
      .update({
        last_token_issued_at: payload.issued_at,
        last_token_expires_at: payload.expires_at,
      })
      .eq("id", session_id);

    return new Response(
      JSON.stringify({ token: tokenStr, expires_at: payload.expires_at, rotation_seconds: session.qr_rotation_seconds ?? 5 }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    console.error("generate-qr-token error", err);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: corsHeaders },
    );
  }
});
