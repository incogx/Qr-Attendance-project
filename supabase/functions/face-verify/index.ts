// supabase-edge/face-verify.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { serve } from 'jsr:@supabase/functions-js';

// CORS (be careful with '*' in production; restrict to your apps)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface FaceVerifyRequest {
  student_id: string;
  image_base64: string;
  session_token?: string; // optional: link verification to a session
}

interface FaceVerifyResponse {
  match: boolean;
  confidence: number;
  message?: string;
}

serve(async (req: Request) => {
  try {
    // Preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Basic auth check (require Authorization Bearer <JWT>)
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const jwt = authHeader.split(' ')[1];

    // Optionally: verify the JWT matches the student_id (recommended).
    // You can verify the JWT using Supabase's public key or call supabase.auth.getUser(jwt)
    // For brevity we only accept that a JWT is present here. PLEASE add real verification.
    // e.g. const user = await supabase.auth.getUser(jwt) or verify with jose library.

    // Parse body
    const body = await req.json().catch(() => null) as FaceVerifyRequest | null;
    if (!body) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { student_id, image_base64 } = body;
    if (!student_id || !image_base64) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Protect against huge payloads
    const MAX_BASE64_SIZE_BYTES = 2_000_000; // ~2MB base64 (adjust as needed)
    if (image_base64.length > MAX_BASE64_SIZE_BYTES) {
      return new Response(JSON.stringify({ error: 'Image too large' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === MOCK VERIFICATION (replace with real service) ===
    // In production, send image_base64 to a face-recognition service (or compute embedding locally)
    // The service should return a match boolean and a numeric confidence (0.0 - 1.0).
    const mockConfidence = 0.80 + Math.random() * 0.15; // 0.80 - 0.95
    const match = mockConfidence >= 0.75;

    // Optionally: write audit log to DB (attendance_audit)
    // NOTE: In an Edge Function you can use the Supabase service key (from env) or call an RPC.
    // Pseudocode (do not include service_role in client): 
    // const sb = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    // await sb.from('attendance_audit').insert([{ student_id, method: 'face-server', success: match, verification_confidence: mockConfidence, raw_response: {...} }]);

    const response: FaceVerifyResponse = {
      match,
      confidence: Math.min(mockConfidence, 0.99),
      message: match ? 'Verified' : 'Not verified',
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Face verification error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
