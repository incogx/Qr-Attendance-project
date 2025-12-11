import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

interface ScheduleItem {
  time: string;
  subject: string;
  room: string;
  type: string;
  color: string;
}

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay() || 1);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - date.getDay() + i);
    return date.getDate();
  });

  // Mock schedule data - in real app, fetch from Supabase
  const scheduleData: Record<number, ScheduleItem[]> = {
    0: [], // Sunday
    1: [
      // Monday
      {
        time: '9:00 AM',
        subject: 'Advanced Mathematics',
        room: 'Room 201, Block A',
        type: 'Lecture',
        color: '#6366f1',
      },
      {
        time: '2:00 PM',
        subject: 'Physics Laboratory',
        room: 'Lab 102, Block C',
        type: 'Lab',
        color: '#dc2626',
      },
    ],
    2: [
      // Tuesday
      {
        time: '9:00 AM',
        subject: 'Advanced Mathematics',
        room: 'Room 201, Block A',
        type: 'Lecture',
        color: '#6366f1',
      },
      {
        time: '11:30 AM',
        subject: 'Computer Science',
        room: 'Lab 305, Block B',
        type: 'Practical',
        color: '#059669',
      },
      {
        time: '2:00 PM',
        subject: 'Physics Laboratory',
        room: 'Lab 102, Block C',
        type: 'Lab',
        color: '#dc2626',
      },
    ],
    3: [
      // Wednesday
      {
        time: '10:00 AM',
        subject: 'English Literature',
        room: 'Room 105, Block A',
        type: 'Lecture',
        color: '#7c3aed',
      },
      {
        time: '1:00 PM',
        subject: 'Computer Science',
        room: 'Lab 305, Block B',
        type: 'Theory',
        color: '#059669',
      },
    ],
    4: [
      // Thursday
      {
        time: '9:00 AM',
        subject: 'Advanced Mathematics',
        room: 'Room 201, Block A',
        type: 'Tutorial',
        color: '#6366f1',
      },
      {
        time: '11:00 AM',
        subject: 'Physics Laboratory',
        room: 'Lab 102, Block C',
        type: 'Lab',
        color: '#dc2626',
      },
      {
        time: '3:00 PM',
        subject: 'English Literature',
        room: 'Room 105, Block A',
        type: 'Discussion',
        color: '#7c3aed',
      },
    ],
    5: [
      // Friday
      {
        time: '10:00 AM',
        subject: 'Computer Science',
        room: 'Lab 305, Block B',
        type: 'Project',
        color: '#059669',
      },
      {
        time: '2:30 PM',
        subject: 'Advanced Mathematics',
        room: 'Room 201, Block A',
        type: 'Exam',
        color: '#6366f1',
      },
    ],
    6: [
      // Saturday
      {
        time: '9:00 AM',
        subject: 'Study Group',
        room: 'Library, Block A',
        type: 'Group Study',
        color: '#f59e0b',
      },
    ],
  };

  const currentDaySchedule = scheduleData[selectedDay] || [];

  return (
    <>
      <StatusBar style="light" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#771C32', '#9E2A48']}
          style={[styles.header, { paddingTop: insets.top + 60 }]}
        >
          <Text style={styles.headerTitle}>Class Schedule</Text>
          <Text style={styles.headerSubtitle}>
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          {/* Calendar Navigation */}
          <View style={styles.calendarNav}>
            <TouchableOpacity style={styles.navButton}>
              <ChevronLeft size={20} color="#771C32" />
            </TouchableOpacity>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysContainer}>
              {days.map((day: string, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayButton,
                    selectedDay === index && styles.selectedDayButton,
                  ]}
                  onPress={() => setSelectedDay(index)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      selectedDay === index && styles.selectedDayText,
                    ]}
                  >
                    {day}
                  </Text>
                  <Text
                    style={[
                      styles.dateText,
                      selectedDay === index && styles.selectedDateText,
                    ]}
                  >
                    {dates[index]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.navButton}>
              <ChevronRight size={20} color="#771C32" />
            </TouchableOpacity>
          </View>

          {/* Schedule for Selected Day */}
          <View style={styles.scheduleContainer}>
          <View style={styles.scheduleHeader}>
            <Calendar size={20} color="#771C32" />
            <Text style={styles.scheduleTitle}>
              {days[selectedDay]}, {new Date().toLocaleDateString('en-US', { month: 'long' })}{' '}
              {dates[selectedDay]}
            </Text>
          </View>

            {currentDaySchedule.length > 0 ? (
              <View style={styles.scheduleList}>
                {currentDaySchedule.map((item, index) => (
                  <View key={index} style={styles.scheduleItem}>
                    <View style={styles.timeContainer}>
                      <Text style={styles.timeText}>{item.time}</Text>
                    </View>

                    <View style={[styles.scheduleCard, { borderLeftColor: item.color }]}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.subjectName}>{item.subject}</Text>
                        <View
                          style={[
                            styles.typeBadge,
                            { backgroundColor: `${item.color}20` },
                          ]}
                        >
                          <Text style={[styles.typeText, { color: item.color }]}>
                            {item.type}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardDetails}>
                        <View style={styles.detailItem}>
                          <MapPin size={14} color="#64748b" />
                          <Text style={styles.detailText}>{item.room}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Clock size={14} color="#64748b" />
                          <Text style={styles.detailText}>1.5 hours</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Calendar size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No Classes Today</Text>
                <Text style={styles.emptyText}>Enjoy your free day!</Text>
              </View>
            )}
          </View>

          {/* Week Overview */}
          <View style={styles.overviewContainer}>
            <Text style={styles.overviewTitle}>This Week Overview</Text>

            <View style={styles.overviewStats}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {Object.values(scheduleData).reduce((sum, day) => sum + day.length, 0)}
                </Text>
                <Text style={styles.statLabel}>Total Classes</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>27</Text>
                <Text style={styles.statLabel}>Study Hours</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>5</Text>
                <Text style={styles.statLabel}>Lab Sessions</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>2</Text>
                <Text style={styles.statLabel}>Exams</Text>
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
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
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
  daysContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  dayButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  selectedDayButton: {
    backgroundColor: '#771C32',
  },
  dayText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },
  selectedDayText: {
    color: 'white',
  },
  dateText: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  selectedDateText: {
    color: 'white',
  },
  scheduleContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  scheduleList: {
    gap: 16,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timeContainer: {
    width: 80,
    paddingTop: 4,
  },
  timeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#771C32',
  },
  scheduleCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    marginLeft: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetails: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#64748b',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
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
  overviewContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  overviewStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
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
});

