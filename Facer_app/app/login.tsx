// app/login.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Lock, Mail, Eye, EyeOff } from 'lucide-react-native';

const BRAND = {
  maroon: '#7A1431',
  maroonLight: '#FBECEF',
  surface: '#FFFFFF',
  text: '#4A4A4A',
  muted: '#7A6A6A',
};

export default function LoginScreen() {
  const { signIn, session, student, loading: authLoading } = useAuth();

  const [regNumber, setRegNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hasNavigated = useRef(false);

  /* -------------------------
     REDIRECT AFTER LOGIN
  -------------------------- */
  useEffect(() => {
    if (authLoading) return;
    if (!session) return;
    if (!student) return;
    if (hasNavigated.current) return;

    // Go directly to tabs after login (face verification removed)
    hasNavigated.current = true;
    router.replace('/(tabs)');
  }, [session, student, authLoading]);

  /* -------------------------
     VALIDATION
  -------------------------- */
  const validate = () => {
    setError('');
    const rn = regNumber.trim();

    if (!rn) {
      setError('Please enter your registration number');
      return false;
    }
    if (!/^\d{4,12}$/.test(rn)) {
      setError('Registration number should be 4–12 digits');
      return false;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  /* -------------------------
     LOGIN HANDLER
  -------------------------- */
  const handleLogin = async () => {
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await signIn(regNumber.trim(), password);
      // redirect handled by effect
    } catch (err: any) {
      const msg = err?.message || String(err);
      const lower = msg.toLowerCase();

      if (lower.includes('invalid') || lower.includes('credentials')) {
        setError('Invalid registration number or password.');
      } else if (lower.includes('not found')) {
        setError('Registration number not found. Please sign up.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------
     LOADING STATES
  -------------------------- */
  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={BRAND.maroon} />
      </View>
    );
  }

  if (session) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={BRAND.maroon} />
      </View>
    );
  }

  const inputsDisabled = loading || authLoading;

  /* -------------------------
     UI (UNCHANGED)
  -------------------------- */
  return (
    <>
      <StatusBar style="dark" />
      <LinearGradient colors={['#FFFFFF', '#FDF2F4', BRAND.maroonLight]} style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <TouchableOpacity
              style={{ position: 'absolute', top: 50, left: 20, padding: 6, zIndex: 5 }}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={22} color={BRAND.maroon} />
            </TouchableOpacity>

            <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 26 }}>
              <View style={{ alignItems: 'center', marginBottom: 28 }}>
                <Text style={{ fontSize: 30, fontWeight: '800', color: BRAND.maroon }}>Welcome Back</Text>
                <Text style={{ fontSize: 14, color: BRAND.muted, marginTop: 4 }}>
                  Sign in with Registration Number
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: BRAND.surface,
                  borderRadius: 20,
                  padding: 26,
                  shadowColor: '#000',
                  shadowOpacity: 0.05,
                  shadowRadius: 20,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 5,
                }}
              >
                {error ? (
                  <View
                    style={{
                      backgroundColor: '#fef2f2',
                      borderWidth: 1,
                      borderColor: '#fecaca',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 16,
                    }}
                  >
                    <Text style={{ color: '#dc2626', fontSize: 14 }}>{error}</Text>
                  </View>
                ) : null}

                {/* Registration Number */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: BRAND.surface,
                    borderWidth: 1,
                    borderColor: BRAND.maroonLight,
                    borderRadius: 12,
                    marginBottom: 16,
                  }}
                >
                  <Mail size={18} color={BRAND.maroon} style={{ marginLeft: 14 }} />
                  <TextInput
                    style={{ flex: 1, fontSize: 16, paddingVertical: 14, paddingHorizontal: 14, color: BRAND.text }}
                    placeholder="Registration Number"
                    placeholderTextColor="#A1A1A1"
                    value={regNumber}
                    onChangeText={setRegNumber}
                    keyboardType="number-pad"
                    editable={!inputsDisabled}
                  />
                </View>

                {/* Password */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: BRAND.surface,
                    borderWidth: 1,
                    borderColor: BRAND.maroonLight,
                    borderRadius: 12,
                    marginBottom: 16,
                  }}
                >
                  <Lock size={18} color={BRAND.maroon} style={{ marginLeft: 14 }} />
                  <TextInput
                    style={{ flex: 1, fontSize: 16, paddingVertical: 14, paddingHorizontal: 14, color: BRAND.text }}
                    placeholder="Password"
                    placeholderTextColor="#A1A1A1"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    editable={!inputsDisabled}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ paddingHorizontal: 14 }}>
                    {showPassword ? <EyeOff size={18} color="#A1A1A1" /> : <Eye size={18} color="#A1A1A1" />}
                  </TouchableOpacity>
                </View>

                {/* Sign In Button */}
                <TouchableOpacity
                  style={{
                    borderRadius: 12,
                    overflow: 'hidden',
                    marginBottom: 20,
                    opacity: inputsDisabled ? 0.7 : 1,
                  }}
                  onPress={handleLogin}
                  disabled={inputsDisabled}
                >
                  <LinearGradient
                    colors={[BRAND.maroon, '#9E2A48']}
                    style={{ paddingVertical: 14, alignItems: 'center' }}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>Sign In</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => router.push('/signup')}>
                  <Text style={{ color: BRAND.muted, fontSize: 15 }}>
                    Don't have an account?{' '}
                    <Text style={{ color: BRAND.maroon, fontWeight: '700' }}>Sign Up</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
}
