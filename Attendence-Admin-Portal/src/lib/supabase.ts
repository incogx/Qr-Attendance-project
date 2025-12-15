import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mqnbcgatoppankntpmiu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xbmJjZ2F0b3BwYW5rbnRwbWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NDg1NzUsImV4cCI6MjA4MTIyNDU3NX0._-0le4_b_DmJG7Ama2kWEXZFXIrNFTlGpN9FE05ZwFA';

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
