import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, TrendingUp, Clock, CheckCircle } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

interface AttendanceStats {
  total_classes: number;
  attended: number;
  percentage: number;
}

interface RecentAttendance {
  id: string;
  marked_at: string;
  class_name: string;
  class_code: string;
  method: string;
}

export default function DashboardScreen() {
  const { student, loading: authLoading, session, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<AttendanceStats>({
    total_classes: 0,
    attended: 0,
    percentage: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState<
    RecentAttendance[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!session) {
        router.replace('/');
        return;
      }
      // If we have a session but no student after loading, there might be an issue
      // Still try to load data if student exists
      if (student) {
        loadDashboardData();
      } else if (session.user) {
        // Session exists but student profile not loaded yet
        // This might happen if student record doesn't exist in database
        // Set loading to false so we can show an error
        setLoading(false);
      }
    }
  }, [student, authLoading, session]);

  const loadDashboardData = async () => {
    if (!student) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch attendance stats
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', student.id);

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
        throw attendanceError;
      }

      // Fetch total sessions (simplified - showing all sessions)
      const { count: totalSessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true });

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
        throw sessionsError;
      }

      const attended = attendanceData?.length || 0;
      const total = totalSessions || 0;
      const percentage = total > 0 ? (attended / total) * 100 : 0;

      setStats({
        total_classes: total,
        attended,
        percentage: Math.round(percentage),
      });

      // Fetch recent attendance
      const { data: recentData, error: recentError } = await supabase
        .from('attendance')
        .select(
          `
          id,
          marked_at,
          method,
          classes (
            name,
            code
          )
        `
        )
        .eq('student_id', student.id)
        .order('marked_at', { ascending: false })
        .limit(5);

      if (recentError) {
        console.error('Error fetching recent attendance:', recentError);
        // Don't throw, just log - we can still show the dashboard without recent attendance
      }

      const formattedRecent =
        recentData?.map((item: any) => ({
          id: item.id,
          marked_at: item.marked_at,
          class_name: item.classes?.name || 'Unknown',
          class_code: item.classes?.code || '',
          method: item.method,
        })) || [];

      setRecentAttendance(formattedRecent);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      // Set default values on error so dashboard can still render
      setStats({
        total_classes: 0,
        attended: 0,
        percentage: 0,
      });
      setRecentAttendance([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#771C32" />
      </View>
    );
  }

  // If no session, redirect will happen in useEffect
  if (!session) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#771C32" />
      </View>
    );
  }

  // If session exists but no student profile, show error
  if (!student) {
    return (
      <View className="flex-1 bg-white justify-center items-center px-6">
        <Text className="text-gray-900 text-xl font-semibold mb-4 text-center">
          Profile Not Found
        </Text>
        <Text className="text-gray-600 text-center mb-8">
          Your student profile could not be loaded. Please contact support.
        </Text>
        <TouchableOpacity
          className="rounded-lg py-4 px-8"
          style={{ backgroundColor: '#771C32' }}
          onPress={async () => {
            await signOut();
            router.replace('/');
          }}
        >
          <Text className="text-white font-semibold">Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#771C32" />
        <Text className="text-gray-600 mt-4">Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <ScrollView
        className="flex-1 bg-gray-50"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#771C32"
          />
        }
      >
        {/* Header */}
        <View 
          className="bg-white px-6 pb-6 border-b border-gray-100"
          style={{ paddingTop: insets.top + 16 }}
        >
          <Text className="text-2xl font-bold text-gray-900">Dashboard</Text>
          <Text className="text-gray-600 mt-1">
            Welcome back, {student?.name}
          </Text>
        </View>

        {/* Stats Cards */}
        <View className="px-6 py-6">
          {/* Attendance Percentage Card */}
          <View className="bg-white rounded-xl p-6 mb-4 border border-gray-100">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-gray-600 font-medium">
                Overall Attendance
              </Text>
              <TrendingUp size={20} color="#771C32" />
            </View>
            <Text
              className="text-5xl font-bold mb-2"
              style={{ color: '#771C32' }}
            >
              {stats.percentage}%
            </Text>
            <Text className="text-gray-500 text-sm">
              {stats.attended} of {stats.total_classes} classes attended
            </Text>
          </View>

          {/* Quick Stats Row */}
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1 bg-white rounded-xl p-4 border border-gray-100">
              <Calendar size={20} color="#771C32" className="mb-2" />
              <Text className="text-2xl font-bold text-gray-900">
                {stats.total_classes}
              </Text>
              <Text className="text-gray-600 text-xs mt-1">
                Total Classes
              </Text>
            </View>

            <View className="flex-1 bg-white rounded-xl p-4 border border-gray-100">
              <CheckCircle size={20} color="#10B981" className="mb-2" />
              <Text className="text-2xl font-bold text-gray-900">
                {stats.attended}
              </Text>
              <Text className="text-gray-600 text-xs mt-1">Attended</Text>
            </View>
          </View>

          {/* Recent Attendance */}
          <View className="bg-white rounded-xl p-5 border border-gray-100">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Recent Attendance
            </Text>

            {recentAttendance.length === 0 ? (
              <View className="py-8 items-center">
                <Clock size={32} color="#D1D5DB" />
                <Text className="text-gray-500 mt-3 text-center">
                  No attendance records yet
                </Text>
                <Text className="text-gray-400 text-sm mt-1 text-center">
                  Start scanning QR codes to mark your attendance
                </Text>
              </View>
            ) : (
              recentAttendance.map((item, index) => (
                <View
                  key={item.id}
                  className={`py-3 ${
                    index !== recentAttendance.length - 1
                      ? 'border-b border-gray-100'
                      : ''
                  }`}
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="text-gray-900 font-medium">
                        {item.class_name}
                      </Text>
                      <Text className="text-gray-500 text-sm mt-1">
                        {item.class_code}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-gray-600 text-xs">
                        {formatDate(item.marked_at)}
                      </Text>
                      <View className="mt-1 bg-green-50 px-2 py-1 rounded">
                        <Text className="text-green-700 text-xs font-medium">
                          Present
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Quick Action */}
          <TouchableOpacity
            className="rounded-xl py-4 items-center mt-6"
            style={{ backgroundColor: '#771C32' }}
            onPress={() => router.push('/(tabs)/scanner')}
            accessibilityLabel="Scan QR code"
            accessibilityRole="button"
          >
            <Text className="text-white font-semibold text-base">
              Scan QR Code
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}
