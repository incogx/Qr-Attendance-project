// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";

// Local Profile type that matches your `profiles` table
export interface Profile {
  id: string;
  email: string;
  full_name?: string | null;
  role: "STUDENT" | "FACULTY" | "HOD" | "ADMIN" | string;
  created_at?: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // fetch profile from `profiles` table (not admin_users)
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      // normalize role to uppercase and trim whitespace
      const normalized = data
        ? {
            ...data,
            role: typeof data.role === "string" ? data.role.toString().toUpperCase().trim() : data.role,
          }
        : null;

      setProfile(normalized);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // initial session check
    (async () => {
      try {
        setLoading(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const sUser = session?.user ?? null;
        if (!mounted) return;
        setUser(sUser);
        if (sUser) {
          await fetchProfile(sUser.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      } catch (err) {
        console.error("Initial session check failed:", err);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    })();

    // listen to auth changes
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);

      // if logged in, fetch profile (and set loading while we fetch)
      if (u) {
        setLoading(true);
        fetchProfile(u.id);
      } else {
        // logged out: clear profile and stop loading
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      data.subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    // attempt sign-in
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // After sign-in, ensure session/profile are loaded before resolving.
    // supabase.onAuthStateChange will run too, but fetch explicitly to avoid race.
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const sUser = session?.user ?? null;
      setUser(sUser);
      if (sUser) {
        await fetchProfile(sUser.id);
        // fetchProfile sets loading = false when done
      } else {
        setProfile(null);
        setLoading(false);
      }
    } catch (err) {
      console.error("Post sign-in session/profile load failed:", err);
      setLoading(false);
      throw err;
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: string) => {
    // NOTE: For your production flow, you said accounts are pre-created.
    // Keep this only for development or remove it later.
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data?.user) {
      // insert into profiles table
      const normalizedRole = (role ?? "").toString().toUpperCase().trim();
      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: data.user.id,
          email,
          full_name: fullName,
          role: normalizedRole,
        },
      ]);

      if (profileError) throw profileError;
    }
  };

  const signOut = async () => {
    try {
      // call supabase signOut (server/session invalidation)
      const { error } = await supabase.auth.signOut();
      if (error) console.warn("Supabase signOut returned error:", error);

      // clear client-side persisted auth or app state that might keep user "logged in".
      // If you use specific keys (eg. "sb-access-token") replace with those keys instead of clearing everything.
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (err) {
        console.warn("storage clear failed", err);
      }

      // reset context state
      setUser(null);
      setProfile(null);
      setLoading(false);
    } catch (err) {
      console.error("Error during signOut:", err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
