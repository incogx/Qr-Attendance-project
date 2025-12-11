// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Cross-platform Supabase client for Expo (web + native).
 * Provide credentials via app.config.js -> extra OR via env vars for web.
 *
 * Example app.config.js:
 * export default {
 *   extra: {
 *     supabaseUrl: "https://your-project.supabase.co",
 *     supabaseAnonKey: "public-anon-key",
 *   }
 * }
 */

/* Resolve config (expo extra preferred, fallback to env) */
const expoExtra = (Constants.expoConfig && (Constants.expoConfig.extra as any)) || {};
const SUPABASE_URL =
  expoExtra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || (global as any).__SUPABASE_URL__;
const SUPABASE_ANON_KEY =
  expoExtra.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || (global as any).__SUPABASE_ANON_KEY__;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fail fast with a clear message instead of a generic "Invalid API key" error later
  throw new Error(
    'Missing Supabase configuration. Add supabaseUrl & supabaseAnonKey to app.config.js -> extra or set EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY env vars.'
  );
}

/* Storage adapter required by supabase-js for auth persistence.
   Uses Expo SecureStore on native and localStorage on web (wrapped as async). */
const ExpoSecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

/* Strongly-typed Database definition (adjust columns if your schema differs) */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: 'STUDENT' | 'FACULTY' | 'HOD' | 'ADMIN' | null;
          department: string | null;
          phone: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          role?: 'STUDENT' | 'FACULTY' | 'HOD' | 'ADMIN' | null;
          department?: string | null;
          phone?: string | null;
          created_at?: string | null;
        };
        Update: {
          email?: string | null;
          full_name?: string | null;
          role?: 'STUDENT' | 'FACULTY' | 'HOD' | 'ADMIN' | null;
          department?: string | null;
          phone?: string | null;
          created_at?: string | null;
        };
      };

      student_profiles: {
        Row: {
          id: string;
          register_no: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          department: string | null;
          class_no: string | null;
          section: string | null;
          face_enrolled: boolean | null;
          face_template_id: string | null;
          consent_face: boolean | null;
          device_bound: boolean | null;
          device_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          register_no: string;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          department?: string | null;
          class_no?: string | null;
          section?: string | null;
          face_enrolled?: boolean | null;
          face_template_id?: string | null;
          consent_face?: boolean | null;
          device_bound?: boolean | null;
          device_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          register_no?: string;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          department?: string | null;
          class_no?: string | null;
          section?: string | null;
          face_enrolled?: boolean | null;
          face_template_id?: string | null;
          consent_face?: boolean | null;
          device_bound?: boolean | null;
          device_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };

      classes: {
        Row: {
          id: string;
          name: string | null;
          code: string | null;
          instructor_name: string | null;
          created_at: string | null;
          class_no: string | null;
          faculty_id: string | null;
          department: string | null;
        };
        Insert: {
          id?: string;
          name?: string | null;
          code?: string | null;
          instructor_name?: string | null;
          created_at?: string | null;
          class_no?: string | null;
          faculty_id?: string | null;
          department?: string | null;
        };
        Update: {
          name?: string | null;
          code?: string | null;
          instructor_name?: string | null;
          created_at?: string | null;
          class_no?: string | null;
          faculty_id?: string | null;
          department?: string | null;
        };
      };

      attendance_sessions: {
        Row: {
          id: string;
          class_no: string | null;
          class_id: string | null;
          faculty_id: string | null;
          faculty_name: string | null;
          department: string | null;
          session_date: string | null;
          started_at: string | null;
          ended_at: string | null;
          status: string | null;
          qr_token: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          class_no: string;
          class_id?: string | null;
          faculty_id?: string | null;
          faculty_name?: string | null;
          department?: string | null;
          session_date?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          status?: string | null;
          qr_token?: string | null;
          created_at?: string | null;
        };
        Update: {
          class_no?: string;
          class_id?: string | null;
          faculty_id?: string | null;
          faculty_name?: string | null;
          department?: string | null;
          session_date?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          status?: string | null;
          qr_token?: string | null;
          created_at?: string | null;
        };
      };

      attendance_marks: {
        Row: {
          id: string;
          session_id: string | null;
          class_no: string | null;
          student_id: string | null;
          register_no: string | null;
          student_name: string | null;
          status: 'PRESENT' | 'ABSENT' | null;
          marked_at: string | null;
          marked_by: string | null;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          class_no?: string | null;
          student_id?: string | null;
          register_no?: string | null;
          student_name?: string | null;
          status?: 'PRESENT' | 'ABSENT' | null;
          marked_at?: string | null;
          marked_by?: string | null;
        };
        Update: {
          session_id?: string | null;
          class_no?: string | null;
          student_id?: string | null;
          register_no?: string | null;
          student_name?: string | null;
          status?: 'PRESENT' | 'ABSENT' | null;
          marked_at?: string | null;
          marked_by?: string | null;
        };
      };

      attendance_approvals: {
        Row: {
          session_id: string;
          hod_id: string | null;
          status: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
          comment: string | null;
          updated_at: string | null;
        };
        Insert: {
          session_id: string;
          hod_id?: string | null;
          status?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
          comment?: string | null;
          updated_at?: string | null;
        };
        Update: {
          hod_id?: string | null;
          status?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
          comment?: string | null;
          updated_at?: string | null;
        };
      };

      // Actual tables used in the codebase
      students: {
        Row: {
          id: string;
          reg_number: string;
          name: string;
          password: string;
          email: string | null;
          phone: string | null;
          department: string | null;
          class_no: string | null;
          section: string | null;
          face_encoding: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          reg_number: string;
          name: string;
          password: string;
          email?: string | null;
          phone?: string | null;
          department?: string | null;
          class_no?: string | null;
          section?: string | null;
          face_encoding?: string | null;
          created_at?: string | null;
        };
        Update: {
          reg_number?: string;
          name?: string;
          password?: string;
          email?: string | null;
          phone?: string | null;
          department?: string | null;
          class_no?: string | null;
          section?: string | null;
          face_encoding?: string | null;
          created_at?: string | null;
        };
      };

      attendance: {
        Row: {
          id: string;
          student_id: string | null;
          class_id: string | null;
          session_id: string | null;
          marked_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          student_id?: string | null;
          class_id?: string | null;
          session_id?: string | null;
          marked_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          student_id?: string | null;
          class_id?: string | null;
          session_id?: string | null;
          marked_at?: string | null;
          created_at?: string | null;
        };
      };

      sessions: {
        Row: {
          id: string;
          class_id: string | null;
          qr_payload: string | null;
          session_date: string | null;
          start_time: string | null;
          end_time: string | null;
          expires_at: string | null;
          status: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          class_id?: string | null;
          qr_payload?: string | null;
          session_date?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          expires_at?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
        Update: {
          class_id?: string | null;
          qr_payload?: string | null;
          session_date?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          expires_at?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
      };
    };
    Views: {};
    Functions: {
      validate_qr: {
        Args: {
          qr_data: string;
        };
        Returns: {
          valid: boolean;
          class_id: string | null;
          session_id: string | null;
          message: string | null;
        };
      };
      mark_attendance: {
        Args: {
          p_student_id: string;
          p_class_id: string;
          p_session_id: string;
          p_method: string;
          p_confidence: number;
        };
        Returns: {
          status: string;
          message: string | null;
        };
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
};

/* Create the supabase client instance */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Export URL and key for direct API calls (like Edge Functions)
export const supabaseUrl = SUPABASE_URL;
export const supabaseAnonKey = SUPABASE_ANON_KEY;
