/**
 * src/lib/supabaseAdmin.ts
 * Admin functions using Supabase service role (client-side only for dev)
 * In production, these should run on server-side
 */

import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string | null;
  role: string;
  department?: string | null;
  phone?: string | null;
  created_at?: string | null;
}

/**
 * List all user profiles
 */
export async function listUsers(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, department, phone, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('listUsers error:', err);
    throw err;
  }
}

/**
 * Create a new user (HOD or FACULTY)
 * Note: In production, use Supabase server-side SDK for auth.admin.createUser
 */
export async function createUser(
  email: string,
  fullName: string,
  role: 'HOD' | 'FACULTY' | 'ADMIN',
  password?: string,
  department?: string,
  phone?: string
): Promise<UserProfile> {
  try {
    // Check if user already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      throw new Error('User with this email already exists');
    }

    // For dev: use regular signUp (will need email verification in prod)
    // In production, use: supabase.auth.admin.createUser()
    const tempPassword = password || (Math.random().toString(36).slice(-10) + 'Aa1!');

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: tempPassword,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    // Insert profile row
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          email,
          full_name: fullName,
          role: role.toUpperCase(),
          department: department || null,
          phone: phone || null,
        },
      ])
      .select()
      .single();

    if (profileError) {
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authData.user.id).catch(err => 
        console.warn('Rollback delete failed:', err)
      );
      throw profileError;
    }

    return profile;
  } catch (err) {
    console.error('createUser error:', err);
    throw err;
  }
}

/**
 * Delete a user by ID (deletes both auth and profile)
 */
export async function deleteUser(userId: string): Promise<void> {
  try {
    // Delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) console.warn('Auth delete warning:', authError);

    // Delete profile row
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) throw profileError;
  } catch (err) {
    console.error('deleteUser error:', err);
    throw err;
  }
}

/**
 * Get attendance records (stub for now)
 */
export async function listAttendance(): Promise<any[]> {
  try {
    // TODO: Implement when database schema is ready
    return [];
  } catch (err) {
    console.error('listAttendance error:', err);
    return [];
  }
}
