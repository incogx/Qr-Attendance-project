// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface AttendanceScanRequest {
  reg_number: string;
  name?: string;
  class_no?: string;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: AttendanceScanRequest = await req.json();
    const { reg_number, name, class_no } = body;

    console.log('Attendance scan request:', { reg_number, name, class_no });

    if (!reg_number || !class_no) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'reg_number and class_no are required' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Call the mark_present_from_mobile RPC
    const { data, error } = await supabase.rpc('mark_present_from_mobile', {
      p_register_no: reg_number,
      p_class_no: class_no,
      p_student_name: name || null,
    });

    if (error) {
      console.error('mark_present_from_mobile RPC error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message || 'Failed to mark attendance' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Attendance marked successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        result: data || { success: true, status: 'PRESENT' }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (err) {
    console.error('attendance-scan error:', err);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err instanceof Error ? err.message : 'Invalid request' 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
