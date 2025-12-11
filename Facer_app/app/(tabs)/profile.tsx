import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  BookOpen,
  Settings,
  LogOut,
  ChevronRight,
  CreditCard,
} from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { student, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [attendancePercentage, setAttendancePercentage] = useState(0);
  const [totalCourses, setTotalCourses] = useState(0);

  useEffect(() => {
    if (student) {
      loadProfileStats();
    }
  }, [student]);

  const loadProfileStats = async () => {
    if (!student) return;

    try {
      // Get attendance percentage
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', student.id);

      const { count: totalSessions } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true });

      const attended = attendanceData?.length || 0;
      const total = totalSessions || 0;
      const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

      setAttendancePercentage(percentage);

      // Get total courses
      const { count: coursesCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true });

      setTotalCourses(coursesCount || 0);
    } catch (error) {
      console.error('Error loading profile stats:', error);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <>
      <StatusBar style="light" />
      <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#771C32', '#9E2A48']}
          style={{
            paddingTop: insets.top + 60,
            paddingBottom: 40,
            paddingHorizontal: 24,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <View style={{ position: 'relative', marginBottom: 16 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 3,
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  backgroundColor: 'rgba(248, 250, 252, 0.9)',
                }}
              >
                <User size={32} color="#771C32" />
              </View>
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  right: -5,
                  bottom: -5,
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  borderRadius: 15,
                  width: 30,
                  height: 30,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CreditCard size={16} color="white" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 4 }}>
              {student?.name || 'Student'}
            </Text>
            <Text style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.9)', marginBottom: 4 }}>
              {student?.reg_number || 'N/A'}
            </Text>
            <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' }}>
              Student ID: {student?.roll_number || 'N/A'}
            </Text>
          </View>
        </LinearGradient>

        <View style={{ flex: 1, marginTop: -20, paddingHorizontal: 24, paddingBottom: 32 }}>
          {/* Personal Information */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 }}>
              Personal Information
            </Text>

            <View
              style={{
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f1f5f9',
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: '#f1f5f9',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                  }}
                >
                  <Mail size={20} color="#771C32" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 2 }}>
                    Email
                  </Text>
                  <Text style={{ fontSize: 16, color: '#1e293b', fontWeight: '500' }}>
                    {student?.email || 'N/A'}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f1f5f9',
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: '#f1f5f9',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                  }}
                >
                  <CreditCard size={20} color="#771C32" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 2 }}>
                    Registration Number
                  </Text>
                  <Text style={{ fontSize: 16, color: '#1e293b', fontWeight: '500' }}>
                    {student?.reg_number || 'N/A'}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: '#f1f5f9',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                  }}
                >
                  <Calendar size={20} color="#771C32" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 2 }}>
                    Member Since
                  </Text>
                  <Text style={{ fontSize: 16, color: '#1e293b', fontWeight: '500' }}>
                    {student?.created_at
                      ? new Date(student.created_at).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Academic Information */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 }}>
              Academic Information
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <View
                style={{
                  flex: 1,
                  minWidth: '45%',
                  backgroundColor: 'white',
                  padding: 20,
                  borderRadius: 16,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <Award size={24} color="#059669" />
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginTop: 8, marginBottom: 4 }}>
                  8.5
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>Current GPA</Text>
              </View>

              <View
                style={{
                  flex: 1,
                  minWidth: '45%',
                  backgroundColor: 'white',
                  padding: 20,
                  borderRadius: 16,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <BookOpen size={24} color="#771C32" />
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginTop: 8, marginBottom: 4 }}>
                  {totalCourses}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>Courses</Text>
              </View>

              <View
                style={{
                  flex: 1,
                  minWidth: '45%',
                  backgroundColor: 'white',
                  padding: 20,
                  borderRadius: 16,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <Calendar size={24} color="#7c3aed" />
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginTop: 8, marginBottom: 4 }}>
                  3rd
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>Year</Text>
              </View>

              <View
                style={{
                  flex: 1,
                  minWidth: '45%',
                  backgroundColor: 'white',
                  padding: 20,
                  borderRadius: 16,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <User size={24} color="#dc2626" />
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginTop: 8, marginBottom: 4 }}>
                  {attendancePercentage}%
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>Attendance</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 }}>
              Quick Actions
            </Text>

            <View
              style={{
                backgroundColor: 'white',
                borderRadius: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f1f5f9',
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: '#f1f5f9',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                  }}
                >
                  <Settings size={20} color="#771C32" />
                </View>
                <Text style={{ flex: 1, fontSize: 16, color: '#1e293b', fontWeight: '500' }}>
                  Account Settings
                </Text>
                <ChevronRight size={20} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f1f5f9',
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: '#f1f5f9',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                  }}
                >
                  <BookOpen size={20} color="#059669" />
                </View>
                <Text style={{ flex: 1, fontSize: 16, color: '#1e293b', fontWeight: '500' }}>
                  Academic Records
                </Text>
                <ChevronRight size={20} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f1f5f9',
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: '#f1f5f9',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                  }}
                >
                  <Calendar size={20} color="#7c3aed" />
                </View>
                <Text style={{ flex: 1, fontSize: 16, color: '#1e293b', fontWeight: '500' }}>
                  Time Table
                </Text>
                <ChevronRight size={20} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: '#f1f5f9',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                  }}
                >
                  <Award size={20} color="#f59e0b" />
                </View>
                <Text style={{ flex: 1, fontSize: 16, color: '#1e293b', fontWeight: '500' }}>
                  Achievements
                </Text>
                <ChevronRight size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Support & Help */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 }}>
              Support & Help
            </Text>

            <View
              style={{
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 }}>
                Need Help?
              </Text>
              <Text style={{ fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 16 }}>
                Contact our support team for any assistance with your account or academic queries.
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: '#771C32',
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                  alignSelf: 'flex-start',
                }}
              >
                <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>Contact Support</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Logout */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'white',
              paddingVertical: 16,
              borderRadius: 12,
              gap: 8,
              borderWidth: 1,
              borderColor: '#fecaca',
            }}
            onPress={handleSignOut}
          >
            <LogOut size={20} color="#dc2626" />
            <Text style={{ fontSize: 16, color: '#dc2626', fontWeight: '600' }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}
