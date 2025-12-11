import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Calendar, AlertCircle, Check, Clock, X, CheckCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

interface Notification {
  id: number;
  type: 'assignment' | 'announcement' | 'grade' | 'event' | 'reminder' | 'system';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  priority: 'high' | 'medium' | 'low';
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      type: 'assignment',
      title: 'Assignment Due Tomorrow',
      message: 'Mathematics - Calculus Problems assignment is due tomorrow at 11:59 PM',
      time: '2 hours ago',
      isRead: false,
      priority: 'high',
    },
    {
      id: 2,
      type: 'announcement',
      title: 'Mid-term Examination Schedule',
      message: 'The mid-term examination schedule has been updated. Please check your timetable.',
      time: '4 hours ago',
      isRead: false,
      priority: 'medium',
    },
    {
      id: 3,
      type: 'grade',
      title: 'Grade Updated',
      message: 'Your grade for Computer Science Quiz has been posted. Score: 95/100',
      time: '1 day ago',
      isRead: true,
      priority: 'low',
    },
    {
      id: 4,
      type: 'event',
      title: 'Sports Day Registration',
      message: 'Registration for annual sports day is now open. Register before November 25th.',
      time: '1 day ago',
      isRead: false,
      priority: 'medium',
    },
    {
      id: 5,
      type: 'reminder',
      title: 'Library Book Return',
      message: 'Your borrowed books are due for return by November 22nd, 2024.',
      time: '2 days ago',
      isRead: true,
      priority: 'low',
    },
    {
      id: 6,
      type: 'system',
      title: 'System Maintenance',
      message: 'The student portal will be under maintenance on Sunday from 2:00 AM to 6:00 AM.',
      time: '3 days ago',
      isRead: true,
      priority: 'low',
    },
  ]);

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, isRead: true } : notif))
    );
  };

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  const getNotificationIcon = (type: string, priority: string) => {
    const iconColor =
      priority === 'high' ? '#dc2626' : priority === 'medium' ? '#f59e0b' : '#771C32';

    switch (type) {
      case 'assignment':
        return <Clock size={20} color={iconColor} />;
      case 'announcement':
        return <Bell size={20} color={iconColor} />;
      case 'grade':
        return <Check size={20} color={iconColor} />;
      case 'event':
        return <Calendar size={20} color={iconColor} />;
      case 'reminder':
        return <AlertCircle size={20} color={iconColor} />;
      default:
        return <Bell size={20} color={iconColor} />;
    }
  };

  const getIconBackground = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#fef2f2';
      case 'medium':
        return '#fefbeb';
      default:
        return '#f1f5f9';
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      <StatusBar style="light" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#771C32', '#9E2A48']}
          style={[styles.header, { paddingTop: insets.top + 60 }]}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Notifications</Text>
              <Text style={styles.headerSubtitle}>
                {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
              </Text>
            </View>
            {unreadCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Bell size={48} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptyText}>
                You're all caught up! Check back later for updates.
              </Text>
            </View>
          ) : (
            <View style={styles.notificationsList}>
              {notifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationItem,
                    !notification.isRead && styles.unreadNotification,
                  ]}
                  onPress={() => markAsRead(notification.id)}
                >
                  <View style={styles.notificationContent}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: getIconBackground(notification.priority) },
                      ]}
                    >
                      {getNotificationIcon(notification.type, notification.priority)}
                    </View>

                    <View style={styles.textContent}>
                      <View style={styles.titleRow}>
                        <Text
                          style={[
                            styles.notificationTitle,
                            !notification.isRead && styles.unreadTitle,
                          ]}
                        >
                          {notification.title}
                        </Text>
                        {!notification.isRead && <View style={styles.unreadDot} />}
                      </View>

                      <Text style={styles.notificationMessage}>{notification.message}</Text>

                      <Text style={styles.notificationTime}>{notification.time}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.dismissButton}
                    onPress={() => removeNotification(notification.id)}
                  >
                    <X size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {notifications.length > 0 && (
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
                }}
              >
              <CheckCircle size={20} color="#771C32" />
              <Text style={styles.actionButtonText}>Mark All as Read</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.clearButton]}
                onPress={() => setNotifications([])}
              >
                <X size={20} color="#dc2626" />
                <Text style={[styles.actionButtonText, styles.clearButtonText]}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  badgeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    marginTop: -20,
    paddingHorizontal: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    backgroundColor: 'white',
    borderRadius: 16,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  notificationsList: {
    gap: 12,
    paddingVertical: 20,
  },
  notificationItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#771C32',
    backgroundColor: '#faf5f6',
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#771C32',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  dismissButton: {
    padding: 8,
    marginLeft: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#771C32',
  },
  clearButton: {
    backgroundColor: '#fef2f2',
  },
  clearButtonText: {
    color: '#dc2626',
  },
});

