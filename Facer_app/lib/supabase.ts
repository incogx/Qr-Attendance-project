// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/* -------------------------
   CONFIG
-------------------------- */

const extra = (Constants.expoConfig?.extra ?? {}) as any;

const SUPABASE_URL =
  extra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  extra.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase configuration');
}

/* -------------------------
   STORAGE ADAPTER
-------------------------- */

const ExpoStorage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

/* -------------------------
   DATABASE TYPES (REAL)
-------------------------- */

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          role: 'ADMIN' | 'HOD' | 'FACULTY' | 'STUDENT';
          department: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: Partial<Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>>;
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };

      students: {
        Row: {
          id: string;
          reg_number: string;
          name: string | null;
          email: string | null;
          phone: string | null;
          department: string | null;
          class_id: string | null;
          class_no: string | null;
          section: string | null;
          created_at: string;
        };
        Insert: Partial<Omit<Database['public']['Tables']['students']['Row'], 'created_at'>>;
        Update: Partial<Database['public']['Tables']['students']['Row']>;
      };

      classes: {
        Row: {
          id: string;
          class_no: string;
          department: string | null;
          created_at: string;
        };
        Insert: Partial<Omit<Database['public']['Tables']['classes']['Row'], 'created_at'>>;
        Update: Partial<Database['public']['Tables']['classes']['Row']>;
      };

      sessions: {
        Row: {
          id: string;
          class_id: string | null;
          qr_payload: string;
          status: 'ACTIVE' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
          session_date: string;
          start_time: string;
          end_time: string | null;
          expires_at: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: Partial<Omit<Database['public']['Tables']['sessions']['Row'], 'created_at'>>;
        Update: Partial<Database['public']['Tables']['sessions']['Row']>;
      };

      attendance_marks: {
        Row: {
          id: string;
          student_id: string;
          class_id: string;
          session_id: string;
          status: 'PRESENT' | 'ABSENT';
          marked_at: string;
        };
        Insert: Partial<Omit<Database['public']['Tables']['attendance_marks']['Row'], 'marked_at'>>;
        Update: Partial<Database['public']['Tables']['attendance_marks']['Row']>;
      };

      approvals: {
        Row: {
          id: string;
          session_id: string;
          submitted_by: string;
          submitted_at: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          status: 'PENDING' | 'APPROVED' | 'REJECTED';
          comments: string | null;
        };
        Insert: Partial<Database['public']['Tables']['approvals']['Row']>;
        Update: Partial<Database['public']['Tables']['approvals']['Row']>;
      };

      system_settings: {
        Row: {
          id: string;
          student_signup_enabled: boolean;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['system_settings']['Row']>;
        Update: Partial<Database['public']['Tables']['system_settings']['Row']>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
};

/* -------------------------
   SUPABASE CLIENT
-------------------------- */

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: ExpoStorage as any,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

export const supabaseUrl = SUPABASE_URL;
export const supabaseAnonKey = SUPABASE_ANON_KEY;
