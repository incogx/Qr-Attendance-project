// app/signup.tsx
import { useState, useEffect } from 'react';
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
import { ArrowLeft, Lock, User, Phone, Eye, EyeOff, BookOpen, ChevronDown } from 'lucide-react-native';

const BRAND = {
  maroon: '#7A1431',
  maroonLight: '#FBECEF',
  gold: '#F3C969',
  surface: '#FFFFFF',
  text: '#4A4A4A',
  muted: '#7A6A6A',
  lightGray: '#F3F4F6',
};

const DEPARTMENTS = [
  'CSE',
  'ECE',
  'MECH',
  'CIVIL',
  'IT',
  'EEE',
  'BIOTECH',
  'OTHER',
];

export default function SignupScreen() {
  const { signUp, session, loading: authLoading } = useAuth();

  const [regNumber, setRegNumber] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [classNumber, setClassNumber] = useState('');
  const [section, setSection] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeptPicker, setShowDeptPicker] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && session) {
      router.replace('/(tabs)');
    }
  }, [session, authLoading]);

  if (authLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color={BRAND.maroon} />
      </View>
    );
  }

  if (session) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color={BRAND.maroon} />
      </View>
    );
  }

  const validateInputs = () => {
    setError('');
    const reg = (regNumber || '').trim();
    const nm = (name || '').trim();
    const ph = (phone || '').trim();
    const cls = (classNumber || '').trim();
    const sec = (section || '').trim();

    if (!reg) {
      setError('Please enter your registration number');
      return false;
    }
    if (!/^\d{4,12}$/.test(reg)) {
      setError('Registration number should be numeric (4-12 digits)');
      return false;
    }
    if (!nm || nm.length < 2) {
      setError('Please enter your full name');
      return false;
    }
    if (!ph || !/^\+?\d{7,15}$/.test(ph)) {
      setError('Please enter a valid phone number (with country code if needed)');
      return false;
    }
    if (!department || department.length < 1) {
      setError('Please select your department');
      return false;
    }
    if (!cls) {
      setError('Please enter your class number');
      return false;
    }
    if (!sec) {
      setError('Please enter your section');
      return false;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    setError('');
    if (!validateInputs()) return;

    setLoading(true);
    try {
      await signUp(
        regNumber.trim(),
        password,
        name.trim(),
        '', // email - not required anymore
        phone.trim(),
        department,
        classNumber.trim(),
        section.trim()
      );

      // success -> go to face enrollment
      router.replace('/face-capture');
    } catch (err: any) {
      // show friendly message
      const msg = err?.message || err?.error || 'Sign up failed. Please try again.';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#FFFFFF', '#FDF2F4', BRAND.maroonLight]}
        style={{ flex: 1 }}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: Platform.OS === 'android' ? 50 : 50,
                left: 14,
                zIndex: 5,
                padding: 6,
              }}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={22} color={BRAND.maroon} />
            </TouchableOpacity>

            <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 }}>
              {/* Header */}
              <View style={{ alignItems: 'center', marginBottom: 28 }}>
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: BRAND.maroonLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <BookOpen size={32} color={BRAND.maroon} />
                </View>
                <Text style={{ fontSize: 26, fontWeight: '800', color: BRAND.maroon, marginBottom: 6 }}>Create Account</Text>
                <Text style={{ fontSize: 14, color: BRAND.muted }}>Register to mark attendance</Text>
              </View>

              {/* Form Card */}
              <View
                style={{
                  backgroundColor: BRAND.surface,
                  borderRadius: 16,
                  padding: 18,
                  shadowColor: '#000',
                  shadowOpacity: 0.08,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 5,
                }}
              >
                {/* Error Message */}
                {error ? (
                  <View
                    style={{
                      backgroundColor: '#FEE2E2',
                      borderLeftWidth: 4,
                      borderLeftColor: '#DC2626',
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 16,
                    }}
                  >
                    <Text style={{ color: '#991B1B', fontSize: 13, fontWeight: '500' }}>{error}</Text>
                  </View>
                ) : null}

                {/* Registration Number & Name in 2 columns */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                  {/* Reg Number */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: BRAND.text, marginBottom: 6 }}>Reg. Number</Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: BRAND.lightGray,
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        borderRadius: 10,
                        overflow: 'hidden',
                      }}
                    >
                      <User size={16} color={BRAND.maroon} style={{ marginLeft: 10 }} />
                      <TextInput
                        style={{ flex: 1, fontSize: 14, paddingVertical: 12, paddingHorizontal: 10, color: BRAND.text }}
                        placeholder="43732001"
                        placeholderTextColor="#9CA3AF"
                        value={regNumber}
                        onChangeText={setRegNumber}
                        keyboardType="number-pad"
                        editable={!loading}
                      />
                    </View>
                  </View>

                  {/* Name */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: BRAND.text, marginBottom: 6 }}>Full Name</Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: BRAND.lightGray,
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        borderRadius: 10,
                        overflow: 'hidden',
                      }}
                    >
                      <User size={16} color={BRAND.maroon} style={{ marginLeft: 10 }} />
                      <TextInput
                        style={{ flex: 1, fontSize: 14, paddingVertical: 12, paddingHorizontal: 10, color: BRAND.text }}
                        placeholder="Your name"
                        placeholderTextColor="#9CA3AF"
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                        editable={!loading}
                      />
                    </View>
                  </View>
                </View>

                {/* Phone */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: BRAND.text, marginBottom: 6 }}>Phone Number</Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: BRAND.lightGray,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 10,
                      overflow: 'hidden',
                    }}
                  >
                    <Phone size={16} color={BRAND.maroon} style={{ marginLeft: 10 }} />
                    <TextInput
                      style={{ flex: 1, fontSize: 14, paddingVertical: 12, paddingHorizontal: 10, color: BRAND.text }}
                      placeholder="+919000000000"
                      placeholderTextColor="#9CA3AF"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      editable={!loading}
                    />
                  </View>
                </View>

                {/* Department & Class in 2 columns */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                  {/* Department */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: BRAND.text, marginBottom: 6 }}>Department</Text>
                    <TouchableOpacity
                      onPress={() => setShowDeptPicker(!showDeptPicker)}
                      disabled={loading}
                      activeOpacity={0.7}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: BRAND.lightGray,
                          borderWidth: 1,
                          borderColor: '#E5E7EB',
                          borderRadius: 10,
                          paddingVertical: 12,
                          paddingHorizontal: 10,
                        }}
                      >
                        <Text style={{ fontSize: 14, color: BRAND.text, fontWeight: '500' }}>{department}</Text>
                        <ChevronDown size={16} color={BRAND.maroon} />
                      </View>
                    </TouchableOpacity>
                    
                    {/* Department Dropdown Menu */}
                    {showDeptPicker && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 55,
                          left: 0,
                          right: 0,
                          backgroundColor: BRAND.surface,
                          borderWidth: 1,
                          borderColor: '#E5E7EB',
                          borderRadius: 10,
                          zIndex: 1000,
                          shadowColor: '#000',
                          shadowOpacity: 0.1,
                          shadowRadius: 8,
                          shadowOffset: { width: 0, height: 2 },
                          elevation: 8,
                        }}
                      >
                        <ScrollView style={{ maxHeight: 200 }}>
                          {DEPARTMENTS.map((dept) => (
                            <TouchableOpacity
                              key={dept}
                              onPress={() => {
                                setDepartment(dept);
                                setShowDeptPicker(false);
                              }}
                              style={{
                                paddingVertical: 10,
                                paddingHorizontal: 12,
                                borderBottomWidth: 1,
                                borderBottomColor: '#F3F4F6',
                              }}
                              activeOpacity={0.6}
                            >
                              <Text
                                style={{
                                  fontSize: 14,
                                  color: department === dept ? BRAND.maroon : BRAND.text,
                                  fontWeight: department === dept ? '700' : '500',
                                }}
                              >
                                {dept}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Class Number */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: BRAND.text, marginBottom: 6 }}>Class</Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: BRAND.lightGray,
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        borderRadius: 10,
                        overflow: 'hidden',
                      }}
                    >
                      <TextInput
                        style={{ flex: 1, fontSize: 14, paddingVertical: 12, paddingHorizontal: 10, color: BRAND.text }}
                        placeholder="373"
                        placeholderTextColor="#9CA3AF"
                        value={classNumber}
                        onChangeText={setClassNumber}
                        keyboardType="number-pad"
                        editable={!loading}
                      />
                    </View>
                  </View>
                </View>

                {/* Section */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: BRAND.text, marginBottom: 6 }}>Section</Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: BRAND.lightGray,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 10,
                      overflow: 'hidden',
                    }}
                  >
                    <TextInput
                      style={{ flex: 1, fontSize: 14, paddingVertical: 12, paddingHorizontal: 10, color: BRAND.text }}
                      placeholder="A"
                      placeholderTextColor="#9CA3AF"
                      value={section}
                      onChangeText={setSection}
                      autoCapitalize="characters"
                      editable={!loading}
                    />
                  </View>
                </View>

                {/* Password */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: BRAND.text, marginBottom: 6 }}>Password</Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: BRAND.lightGray,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 10,
                      overflow: 'hidden',
                    }}
                  >
                    <Lock size={16} color={BRAND.maroon} style={{ marginLeft: 10 }} />
                    <TextInput
                      style={{ flex: 1, fontSize: 14, paddingVertical: 12, paddingHorizontal: 10, color: BRAND.text }}
                      placeholder="Min 6 characters"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      editable={!loading}
                    />
                    <TouchableOpacity style={{ paddingHorizontal: 10, paddingVertical: 12 }} onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                      {showPassword ? <EyeOff size={16} color={BRAND.muted} /> : <Eye size={16} color={BRAND.muted} />}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: BRAND.text, marginBottom: 6 }}>Confirm Password</Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: BRAND.lightGray,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 10,
                      overflow: 'hidden',
                    }}
                  >
                    <Lock size={16} color={BRAND.maroon} style={{ marginLeft: 10 }} />
                    <TextInput
                      style={{ flex: 1, fontSize: 14, paddingVertical: 12, paddingHorizontal: 10, color: BRAND.text }}
                      placeholder="Confirm password"
                      placeholderTextColor="#9CA3AF"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      editable={!loading}
                    />
                    <TouchableOpacity style={{ paddingHorizontal: 10, paddingVertical: 12 }} onPress={() => setShowConfirmPassword(!showConfirmPassword)} activeOpacity={0.7}>
                      {showConfirmPassword ? <EyeOff size={16} color={BRAND.muted} /> : <Eye size={16} color={BRAND.muted} />}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Sign Up Button */}
                <TouchableOpacity
                  style={{ borderRadius: 10, marginVertical: 4, overflow: 'hidden', opacity: loading ? 0.75 : 1 }}
                  onPress={handleSignup}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  <LinearGradient colors={[BRAND.maroon, '#9E2A48']} style={{ paddingVertical: 13, alignItems: 'center', justifyContent: 'center' }}>
                    {loading ? (
                      <ActivityIndicator size="small" color={BRAND.surface} />
                    ) : (
                      <Text style={{ color: BRAND.surface, fontSize: 15, fontWeight: '700' }}>Create Account</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Divider */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 14 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
                  <Text style={{ marginHorizontal: 10, color: BRAND.muted, fontSize: 12 }}>or</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
                </View>

                {/* Login Link */}
                <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 8 }} onPress={() => router.push('/login')} activeOpacity={0.7} disabled={loading}>
                  <Text style={{ color: BRAND.muted, fontSize: 14 }}>
                    Already have an account? <Text style={{ color: BRAND.maroon, fontWeight: '700' }}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Info Text */}
              <View style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ color: BRAND.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
                  After creating your account, you'll need to capture your face for attendance verification.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
}
