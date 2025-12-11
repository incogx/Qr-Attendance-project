import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Filter } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

interface AttendanceRecord {
  date: string;
  day: string;
  classes: {
    subject: string;
    time: string;
    status: 'present' | 'absent' | 'late';
    faculty: string;
  }[];
}

export default function AttendanceScreen() {
  const { student } = useAuth();
  const insets = useSafeAreaInsets();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    percentage: 0,
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  useEffect(() => {
    if (student) {
      loadAttendanceData();
    }
  }, [student, selectedMonth, selectedYear]);

  const loadAttendanceData = async () => {
    if (!student) return;

    try {
      setLoading(true);

      // Get attendance records for the selected month
      const startDate = new Date(selectedYear, selectedMonth, 1).toISOString();
      const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString();

      const { data: attendanceRecords } = await supabase
        .from('attendance')
        .select(`
          marked_at,
          classes (
            name,
            instructor_name
          ),
          sessions (
            start_time
          )
        `)
        .eq('student_id', student.id)
        .gte('marked_at', startDate)
        .lte('marked_at', endDate)
        .order('marked_at', { ascending: false });

      // Group by date
      const groupedByDate = new Map<string, AttendanceRecord>();

      if (attendanceRecords) {
        attendanceRecords.forEach((record: any) => {
          const date = new Date(record.marked_at);
          const dateKey = date.toISOString().split('T')[0];
          const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

          if (!groupedByDate.has(dateKey)) {
            groupedByDate.set(dateKey, {
              date: dateKey,
              day: dayName,
              classes: [],
            });
          }

          const dayRecord = groupedByDate.get(dateKey)!;
          dayRecord.classes.push({
            subject: (record.classes as any)?.name || 'Unknown',
            time: (record.sessions as any)?.start_time || 'N/A',
            status: 'present',
            faculty: (record.classes as any)?.instructor_name || 'Unknown',
          });
        });
      }

      const records = Array.from(groupedByDate.values());

      // Calculate stats
      let totalClasses = 0;
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;

      records.forEach((day) => {
        day.classes.forEach((cls) => {
          totalClasses++;
          if (cls.status === 'present') presentCount++;
          else if (cls.status === 'absent') absentCount++;
          else if (cls.status === 'late') lateCount++;
        });
      });

      setStats({
        total: totalClasses,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        percentage: totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0,
      });

      setAttendanceData(records);
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle size={16} color="#059669" />;
      case 'absent':
        return <XCircle size={16} color="#dc2626" />;
      case 'late':
        return <Clock size={16} color="#f59e0b" />;
      default:
        return <Clock size={16} color="#94a3b8" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return '#dcfce7';
      case 'absent':
        return '#fef2f2';
      case 'late':
        return '#fefbeb';
      default:
        return '#f1f5f9';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'present':
        return '#059669';
      case 'absent':
        return '#dc2626';
      case 'late':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#771C32" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#771C32', '#9E2A48']}
          style={[styles.header, { paddingTop: insets.top + 60 }]}
        >
          <Text style={styles.headerTitle}>Attendance Record</Text>
          <Text style={styles.headerSubtitle}>Track your class attendance</Text>
        </LinearGradient>

        <View style={styles.content}>
          {/* Month Navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity style={styles.navButton} onPress={() => changeMonth('prev')}>
              <ChevronLeft size={20} color="#771C32" />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {months[selectedMonth]} {selectedYear}
            </Text>
            <TouchableOpacity style={styles.navButton} onPress={() => changeMonth('next')}>
              <ChevronRight size={20} color="#771C32" />
            </TouchableOpacity>
          </View>

          {/* Attendance Stats */}
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Monthly Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.percentage}%</Text>
                <Text style={styles.statLabel}>Attendance Rate</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#059669' }]}>{stats.present}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#dc2626' }]}>{stats.absent}</Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{stats.late}</Text>
                <Text style={styles.statLabel}>Late</Text>
              </View>
            </View>
          </View>

          {/* Attendance History */}
          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Recent Attendance</Text>
              <TouchableOpacity style={styles.filterButton}>
                <Filter size={16} color="#771C32" />
              </TouchableOpacity>
            </View>

            {attendanceData.length === 0 ? (
              <View style={styles.emptyState}>
                <Calendar size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No Attendance Records</Text>
                <Text style={styles.emptyText}>No attendance marked for this month</Text>
              </View>
            ) : (
              <View style={styles.attendanceList}>
                {attendanceData.map((day, dayIndex) => (
                  <View key={dayIndex} style={styles.dayContainer}>
                    <View style={styles.dayHeader}>
                      <View>
                        <Text style={styles.dayDate}>{day.day}</Text>
                        <Text style={styles.dayDateText}>
                          {new Date(day.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>
                      <View style={styles.dayStats}>
                        <Text style={styles.dayStatsText}>
                          {day.classes.filter((c) => c.status === 'present').length}/{day.classes.length} Present
                        </Text>
                      </View>
                    </View>

                    <View style={styles.classesList}>
                      {day.classes.map((cls, classIndex) => (
                        <View key={classIndex} style={styles.classItem}>
                          <View style={styles.classTime}>
                            <Text style={styles.timeText}>{cls.time}</Text>
                          </View>

                          <View style={styles.classDetails}>
                            <Text style={styles.subjectName}>{cls.subject}</Text>
                            <Text style={styles.facultyName}>{cls.faculty}</Text>
                          </View>

                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: getStatusColor(cls.status) },
                            ]}
                          >
                            {getStatusIcon(cls.status)}
                            <Text
                              style={[
                                styles.statusText,
                                { color: getStatusTextColor(cls.status) },
                              ]}
                            >
                              {cls.status.charAt(0).toUpperCase() + cls.status.slice(1)}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingBottom: 30,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    marginTop: -20,
    paddingHorizontal: 24,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  navButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#771C32',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  historyContainer: {
    marginBottom: 24,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  filterButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'white',
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
  },
  attendanceList: {
    gap: 16,
  },
  dayContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dayDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  dayDateText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  dayStats: {
    alignItems: 'flex-end',
  },
  dayStatsText: {
    fontSize: 12,
    color: '#771C32',
    fontWeight: '600',
  },
  classesList: {
    gap: 12,
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  classTime: {
    width: 60,
  },
  timeText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  classDetails: {
    flex: 1,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  facultyName: {
    fontSize: 12,
    color: '#64748b',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

