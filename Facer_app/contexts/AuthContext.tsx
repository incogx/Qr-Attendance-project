// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

type Student = {
  id: string;
  name: string;
  reg_number: string;
  email?: string;
  phone?: string;
  department?: string;
  class_no?: string;
  section?: string;
  face_encoding?: string | null;
};

interface AuthContextType {
  student: Student | null;
  session: Session | null;
  loading: boolean;
  authLoading: boolean;
  signIn: (reg: string, password: string) => Promise<void>;
  signUp: (
    regNumber: string,
    password: string,
    name: string,
    email: string,
    phone: string,
    department: string,
    classNumber: string,
    section: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refreshStudent: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  student: null,
  session: null,
  loading: false,
  authLoading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshStudent: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Helper to get/set from SecureStore (native) or localStorage (web)
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Initialize: Check for existing session
  useEffect(() => {
    // Check if student is stored locally
    storage.getItem("student").then((studentData) => {
      if (studentData) {
        try {
          const parsed = JSON.parse(studentData);
          setStudent(parsed);
          // Create mock session
          const mockSession = { user: { id: parsed.id } } as any;
          setSession(mockSession);
        } catch (error) {
          console.error("Error parsing stored student:", error);
        }
      }
      setAuthLoading(false);
    });
  }, []);

  // Refresh student profile manually
  const refreshStudent = async () => {
    if (student?.id) {
      try {
        const { data, error } = await supabase
          .from("students")
          .select("*")
          .eq("id", student.id)
          .maybeSingle();

        if (error) {
          console.error("Error refreshing student profile:", error);
          return;
        }

        if (data) {
          setStudent(data);
          await storage.setItem("student", JSON.stringify(data));
        }
      } catch (error) {
        console.error("Error in refreshStudent:", error);
      }
    }
  };

  // Sign in with registration number and password
  const signIn = async (reg: string, password: string) => {
    setLoading(true);
    try {
      // Find student by registration number and verify password
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("reg_number", reg.trim())
        .maybeSingle();

      if (studentError) throw studentError;
      if (!studentData) {
        throw new Error("Registration number not found");
      }

      // Verify password (stored as plain text in database for this simple implementation)
      if ((studentData as any).password !== password) {
        throw new Error("Incorrect password");
      }

      // Set student and create a mock session
      setStudent(studentData as Student);
      await storage.setItem("student", JSON.stringify(studentData));
      await storage.setItem("regNumber", reg.trim());
      
      // Create a mock session object for compatibility
      const mockSession = {
        user: { id: (studentData as any).id }
      } as any;
      setSession(mockSession);
    } finally {
      setLoading(false);
    }
  };

  // Sign up new user
  const signUp = async (
    regNumber: string,
    password: string,
    name: string,
    email: string,
    phone: string,
    department: string,
    classNumber: string,
    section: string
  ) => {
    setLoading(true);
    try {
      // Check if registration number already exists
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id")
        .eq("reg_number", regNumber.trim())
        .maybeSingle();

      if (existingStudent) {
        throw new Error("Registration number already exists. Please log in instead.");
      }

      // Create student with password stored in database
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .insert({
          reg_number: regNumber.trim(),
          password: password,
          name: name.trim(),
          email: email?.trim().toLowerCase() || null,
          phone: phone?.trim() || null,
          department: department || null,
          class_no: classNumber?.trim() || null,
          section: section?.trim() || null,
        } as any)
        .select()
        .single();

      if (studentError) {
        console.error("Signup error:", studentError);
        throw studentError;
      }

      if (!studentData) {
        throw new Error("Failed to create student account");
      }

      // Set student immediately
      setStudent(studentData as Student);
      await storage.setItem("student", JSON.stringify(studentData));
      // Create mock session
      const mockSession = { user: { id: (studentData as any).id } } as any;
      setSession(mockSession);
      console.log('Signup success - Student created:', (studentData as any).name, 'Face encoding:', (studentData as any).face_encoding);
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    setLoading(true);
    try {
      setStudent(null);
      setSession(null);
      await storage.removeItem("student");
      await storage.removeItem("regNumber");
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        student,
        session,
        loading,
        authLoading,
        signIn,
        signUp,
        signOut,
        refreshStudent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
