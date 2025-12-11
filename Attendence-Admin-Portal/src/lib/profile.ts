import { supabase } from './supabaseClient';

export async function fetchProfileById(uid: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', uid)
    .single();
  if (error) throw error;
  return data;
}
