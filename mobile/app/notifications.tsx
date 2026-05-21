import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getToken } from '../services/authService';
import socketService from '../services/socket';

type Notification = {
  _id: string;
  type: 'like' | 'comment' | 'message';
  senderName: string;
  content: string;
  read: boolean;
  createdAt: string;
  postId?: string;
};

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
    setupSocketListener();
    return () => {
      socketService.off('new_notification');
    };
  }, []);

  const setupSocketListener = () => {
    socketService.on('new_notification', (notification: Notification) => {
      console.log('🔔 New notification:', notification);
      setNotifications(prev => [notification, ...prev]);
      // Also update badge count in home screen
    });
  };

  const loadNotifications = async () => {
    try {
      const token = await getToken();
      const response = await fetch('http://192.168.1.69:5000/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const token = await getToken();
      await fetch(`http://192.168.1.69:5000/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = await getToken();
      await fetch('http://192.168.1.69:5000/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handlePress = (item: Notification) => {
    if (!item.read) {
      markAsRead(item._id);
    }
    
    if (item.type === 'like' || item.type === 'comment') {
      // Navigate to post detail
      router.push('/(tabs)');
    } else if (item.type === 'message') {
      router.push('/chatlist');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return 'heart';
      case 'comment': return 'chatbubble';
      case 'message': return 'chatbubble-ellipses';
      default: return 'notifications';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'like': return '#F43F5E';
      case 'comment': return '#10B981';
      case 'message': return '#6C63FF';
      default: return '#6C63FF';
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.read && styles.unread]}
      onPress={() => handlePress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: getIconColor(item.type) + '15' }]}>
        <Ionicons name={getIcon(item.type)} size={24} color={getIconColor(item.type)} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.type === 'like' ? 'Liked your post' : item.type === 'comment' ? 'Commented on your post' : 'New message'}</Text>
        <Text style={styles.message}>{item.content}</Text>
        <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1C1E21" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.some(n => !n.read) && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-outline" size={64} color="#C4C4D4" />
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptySubtitle}>
            When someone likes or comments on your post, it will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderNotification}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadNotifications} tintColor="#6C63FF" />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFF4',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1C1E21' },
  markAllButton: { padding: 8 },
  markAllText: { fontSize: 13, color: '#6C63FF', fontWeight: '600' },
  listContent: { paddingBottom: 16 },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  unread: { backgroundColor: '#F5F5FF' },
  iconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: '#1C1E21', marginBottom: 2 },
  message: { fontSize: 13, color: '#65676B', marginBottom: 4 },
  time: { fontSize: 11, color: '#9CA3AF' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6C63FF' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1C1E21', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#65676B', textAlign: 'center', marginTop: 8 },
});