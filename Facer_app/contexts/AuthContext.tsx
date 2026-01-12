import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";

type Student = {
  id: string;
  reg_number: string;
  name: string;
  class_no: string | null;
  department: string | null;
  face_encoding: string | null;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  student: Student | null;
  loading: boolean;
  signIn: (reg: string, password: string) => Promise<void>;
  signUp: (data: {
    regNumber: string;
    password: string;
    name: string;
    phone: string;
    department: string;
    classNo: string;
    section: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshStudent: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  // ---------- INIT ----------
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ---------- FETCH STUDENT ----------
  useEffect(() => {
    const fetchStudent = async () => {
      if (!session?.user) {
        setStudent(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Fetch student error:", error.message);
        setStudent(null);
      } else {
        setStudent(data ?? null);
      }

      setLoading(false);
    };

    fetchStudent();
  }, [session]);

  // ---------- SIGN IN ----------
  const signIn = async (reg: string, password: string) => {
    const email = `${reg}@attendance.app`;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  // ---------- SIGN UP ----------
  const signUp = async (data: {
    regNumber: string;
    password: string;
    name: string;
    phone: string;
    department: string;
    classNo: string;
    section: string;
  }) => {
    console.log("🔵 Starting signup...");
    
    const { data: responseData, error } = await supabase.functions.invoke("student-signup", {
      body: {
        reg_number: data.regNumber,
        password: data.password,
        full_name: data.name,
        phone: data.phone,
        department: data.department,
        class_no: data.classNo,
        section: data.section,
      },
    });

    console.log("🔴 Response:", { responseData, error });

    // Handle fetch-level errors (network, timeout, etc.)
    if (error) {
      console.log("🔴 Network error:", error);
      throw new Error(error.message || "Network error occurred");
    }

    // Handle application-level errors from backend
    if (responseData?.error) {
      console.log("🔴 Backend error:", responseData.error);
      throw new Error(responseData.error);
    }

    // Success - responseData.success should be true
    if (!responseData?.success) {
      console.log("🔴 Signup validation failed");
      throw new Error("Signup failed. Please try again.");
    }
    
    console.log("✅ Signup successful! Auto-logging in...");

    // Auto-login after successful signup
    const email = `${data.regNumber}@attendance.app`;
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    });

    if (signInError) {
      throw new Error("Signup successful but login failed. Please login manually.");
    }

    console.log("✅ Auto-login successful!");
  };

  // ---------- REFRESH STUDENT ----------
  const refreshStudent = async () => {
    if (!session?.user) {
      setStudent(null);
      return;
    }

    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error("Refresh student error:", error.message);
      setStudent(null);
    } else {
      setStudent(data ?? null);
    }
  };

  // ---------- SIGN OUT ----------
  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setStudent(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        student,
        loading,
        signIn,
        signUp,
        signOut,
        refreshStudent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
