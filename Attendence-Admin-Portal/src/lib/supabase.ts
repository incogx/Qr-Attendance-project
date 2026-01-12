import { createClient } from '@supabase/supabase-js';

// Read from Vite env only; do not bake defaults
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'educator' | 'content_creator';
  avatar_url?: string;
  created_at: string;
  last_login: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  status: 'draft' | 'published' | 'archived';
  thumbnail_url?: string;
  category: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  duration_hours: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  created_at: string;
}
