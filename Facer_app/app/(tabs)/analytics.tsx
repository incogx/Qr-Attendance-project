import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, TrendingDown, Calendar, Target, Award, AlertTriangle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

interface SubjectData {
  subject: string;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  classes: number;
}

export default function AnalyticsScreen() {
  const { student } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [overallPercentage, setOverallPercentage] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);
  const [attendedClasses, setAttendedClasses] = useState(0);
  const [missedClasses, setMissedClasses] = useState(0);
  const [monthlyData, setMonthlyData] = useState<{ month: string; percentage: number }[]>([]);
  const [subjectData, setSubjectData] = useState<SubjectData[]>([]);

  useEffect(() => {
    if (student) {
      loadAnalytics();
    }
  }, [student]);

  const loadAnalytics = async () => {
    if (!student) return;

    try {
      setLoading(true);

      // Get overall stats
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('id, class_id, classes(name)')
        .eq('student_id', student.id);

      const { count: totalSessions } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true });

      const attended = attendanceData?.length || 0;
      const total = totalSessions || 0;
      const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

      setOverallPercentage(percentage);
      setTotalClasses(total);
      setAttendedClasses(attended);
      setMissedClasses(total - attended);

      // Get monthly data (last 4 months)
      const months = ['Aug', 'Sep', 'Oct', 'Nov'];
      const monthlyStats = months.map((month, index) => {
        // Mock data for now - in real app, calculate from actual attendance
        const basePercentage = 85 + Math.floor(Math.random() * 10);
        return { month, percentage: basePercentage };
      });
      setMonthlyData(monthlyStats);

      // Get subject-wise data
      const subjectMap = new Map<string, { attended: number; total: number }>();
      
      if (attendanceData) {
        attendanceData.forEach((item: any) => {
          const className = item.classes?.name || 'Unknown';
          const current = subjectMap.get(className) || { attended: 0, total: 0 };
          subjectMap.set(className, { ...current, attended: current.attended + 1 });
        });
      }

      // Get total classes per subject
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name');

      if (classesData) {
        classesData.forEach((cls) => {
          const current = subjectMap.get(cls.name) || { attended: 0, total: 0 };
          subjectMap.set(cls.name, { ...current, total: current.total || 10 });
        });
      }

      const subjects: SubjectData[] = Array.from(subjectMap.entries()).map(([name, stats]) => {
        const percentage = stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0;
        return {
          subject: name,
          percentage,
          trend: percentage >= 90 ? 'up' : percentage >= 75 ? 'stable' : 'down',
          classes: stats.attended,
        };
      });

      setSubjectData(subjects);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={16} color="#059669" />;
      case 'down':
        return <TrendingDown size={16} color="#dc2626" />;
      default:
        return <TrendingUp size={16} color="#64748b" />;
    }
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return '#059669';
    if (percentage >= 80) return '#f59e0b';
    return '#dc2626';
  };

  const getPerformanceStatus = (percentage: number) => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 80) return 'Good';
    if (percentage >= 75) return 'Average';
    return 'Needs Improvement';
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
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSubtitle}>Track your attendance performance</Text>
        </LinearGradient>

        <View style={styles.content}>
          {/* Overall Performance */}
          <View style={styles.performanceContainer}>
            <Text style={styles.sectionTitle}>Overall Performance</Text>

            <View style={styles.performanceCard}>
              <View style={styles.performanceHeader}>
                <View style={styles.performanceMain}>
                  <Text style={styles.performancePercentage}>{overallPercentage}%</Text>
                  <Text style={styles.performanceLabel}>Overall Attendance</Text>
                </View>
                <View style={styles.performanceIcon}>
                  <Award size={32} color="#771C32" />
                </View>
              </View>

              <View style={styles.performanceDetails}>
                <View style={styles.performanceItem}>
                  <Text style={styles.performanceNumber}>{attendedClasses}</Text>
                  <Text style={styles.performanceText}>Classes Attended</Text>
                </View>
                <View style={styles.performanceItem}>
                  <Text style={styles.performanceNumber}>{missedClasses}</Text>
                  <Text style={styles.performanceText}>Classes Missed</Text>
                </View>
                <View style={styles.performanceItem}>
                  <Text style={styles.performanceNumber}>{totalClasses}</Text>
                  <Text style={styles.performanceText}>Total Classes</Text>
                </View>
              </View>

              <View style={styles.statusContainer}>
                <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
                  <Text style={[styles.statusText, { color: '#059669' }]}>
                    {getPerformanceStatus(overallPercentage)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Monthly Trend */}
          <View style={styles.trendContainer}>
            <Text style={styles.sectionTitle}>Monthly Trend</Text>

            <View style={styles.chartContainer}>
              <View style={styles.chartArea}>
                {monthlyData.map((item, index) => (
                  <View key={index} style={styles.chartBar}>
                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: (item.percentage / 100) * 120,
                            backgroundColor: getPerformanceColor(item.percentage),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{item.month}</Text>
                    <Text style={styles.barValue}>{item.percentage}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Subject-wise Analysis */}
          <View style={styles.subjectContainer}>
            <Text style={styles.sectionTitle}>Subject-wise Analysis</Text>

            <View style={styles.subjectList}>
              {subjectData.map((subject, index) => (
                <View key={index} style={styles.subjectCard}>
                  <View style={styles.subjectHeader}>
                    <Text style={styles.subjectName}>{subject.subject}</Text>
                    <View style={styles.subjectTrend}>
                      {getTrendIcon(subject.trend)}
                    </View>
                  </View>

                  <View style={styles.subjectStats}>
                    <View style={styles.subjectPercentage}>
                      <Text
                        style={[
                          styles.percentageText,
                          { color: getPerformanceColor(subject.percentage) },
                        ]}
                      >
                        {subject.percentage}%
                      </Text>
                      <Text style={styles.classesText}>{subject.classes} classes</Text>
                    </View>

                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${subject.percentage}%`,
                            backgroundColor: getPerformanceColor(subject.percentage),
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Insights & Recommendations */}
          <View style={styles.insightsContainer}>
            <Text style={styles.sectionTitle}>Insights & Recommendations</Text>

            <View style={styles.insightsList}>
              <View style={styles.insightCard}>
                <View style={styles.insightIcon}>
                  <Target size={20} color="#059669" />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>Great Progress!</Text>
                  <Text style={styles.insightText}>
                    Your attendance has improved this month. Keep it up!
                  </Text>
                </View>
              </View>

              {overallPercentage < 80 && (
                <View style={styles.insightCard}>
                  <View style={[styles.insightIcon, { backgroundColor: '#fef3c7' }]}>
                    <AlertTriangle size={20} color="#f59e0b" />
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>Attendance Alert</Text>
                    <Text style={styles.insightText}>
                      Attendance is below 80%. Consider attending more classes to improve.
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.insightCard}>
                <View style={[styles.insightIcon, { backgroundColor: '#ddd6fe' }]}>
                  <Calendar size={20} color="#7c3aed" />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>Weekly Goal</Text>
                  <Text style={styles.insightText}>
                    Maintain consistent attendance to reach your target.
                  </Text>
                </View>
              </View>
            </View>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  performanceContainer: {
    marginBottom: 32,
  },
  performanceCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  performanceMain: {
    flex: 1,
  },
  performancePercentage: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#771C32',
    marginBottom: 4,
  },
  performanceLabel: {
    fontSize: 16,
    color: '#64748b',
  },
  performanceIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  performanceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  performanceItem: {
    alignItems: 'center',
  },
  performanceNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  performanceText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  trendContainer: {
    marginBottom: 32,
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    height: 120,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: 24,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  barValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subjectContainer: {
    marginBottom: 32,
  },
  subjectList: {
    gap: 12,
  },
  subjectCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  subjectTrend: {
    padding: 4,
  },
  subjectStats: {
    gap: 8,
  },
  subjectPercentage: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  classesText: {
    fontSize: 12,
    color: '#64748b',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  insightsContainer: {
    marginBottom: 32,
  },
  insightsList: {
    gap: 12,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
});

