import { API_URL } from '../src/config';

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
  Dimensions,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getToken } from '../services/authService';
import socketService from '../services/socket';

const { width } = Dimensions.get('window');

type Notification = {
  _id: string;
  type: 'like' | 'comment' | 'message';
  senderName: string;
  content: string;
  read: boolean;
  createdAt: string;
  postId?: string;
};

// Helper function
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

// Animated Notification Item Component
const AnimatedNotificationItem = ({ item, onPress }: { item: Notification; onPress: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
      case 'like': return '#FF3B30';
      case 'comment': return '#34C759';
      case 'message': return '#5856D6';
      default: return '#5856D6';
    }
  };

  const getIconBackground = (type: string) => {
    switch (type) {
      case 'like': return '#FF3B3015';
      case 'comment': return '#34C75915';
      case 'message': return '#5856D615';
      default: return '#5856D615';
    }
  };

  const getTitle = (type: string, name: string) => {
    switch (type) {
      case 'like': return `${name} liked your post`;
      case 'comment': return `${name} commented on your post`;
      case 'message': return `${name} sent you a message`;
      default: return 'New notification';
    }
  };

  return (
    <Animated.View
      style={[
        styles.notificationWrapper,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.notificationItem, !item.read && styles.unread]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: getIconBackground(item.type) }]}>
          <Ionicons name={getIcon(item.type)} size={28} color={getIconColor(item.type)} />
          {!item.read && <View style={styles.iconBadge} />}
        </View>
        
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{getTitle(item.type, item.senderName)}</Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.message} numberOfLines={2}>{item.content}</Text>
          <View style={styles.footer}>
            <Ionicons name="time-outline" size={12} color="#8E8E93" />
            <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
          </View>
        </View>
        
        <Ionicons name="chevron-forward" size={20} color="#C6C6C8" />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMarkAll, setShowMarkAll] = useState(false);

  useEffect(() => {
    loadNotifications();
    setupSocketListener();
    return () => {
      socketService.off('new_notification');
    };
  }, []);

  const setupSocketListener = () => {
    socketService.on('new_notification', (notification: Notification) => {
      Vibration.vibrate(50);
      setNotifications(prev => [notification, ...prev]);
      setShowMarkAll(true);
      setTimeout(() => setShowMarkAll(false), 3000);
    });
  };

  const loadNotifications = async () => {
    try {
      const token = await getToken();
const response = await fetch(`${API_URL}/notifications`, {
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
      await fetch(`${API_URL}/notifications/${id}/read`, {
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
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      Vibration.vibrate(30);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handlePress = (item: Notification) => {
    if (!item.read) {
      markAsRead(item._id);
    }
    
    if (item.type === 'like' || item.type === 'comment') {
      router.push('/(tabs)');
    } else if (item.type === 'message') {
      router.push('/chatlist');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5856D6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ONLY ONE HEADER - Static Header */}
      <View style={styles.mainHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1C1E21" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Mark all</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Floating Mark All Button */}
      {showMarkAll && unreadCount > 0 && (
        <Animated.View style={styles.floatingMarkAll}>
          <TouchableOpacity onPress={markAllAsRead} style={styles.floatingButton}>
            <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
            <Text style={styles.floatingButtonText}>Mark all as read</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#5856D6" />
          </View>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySubtitle}>
            When someone interacts with your content,{'\n'}you'll see it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <AnimatedNotificationItem item={item} onPress={() => handlePress(item)} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={loadNotifications} 
              tintColor="#5856D6"
              colors={['#5856D6']}
            />
          }
          ListHeaderComponent={
            unreadCount > 0 && notifications.length > 0 ? (
              <View style={styles.unreadHeader}>
                <Text style={styles.unreadHeaderText}>NEW</Text>
                <View style={styles.unreadHeaderLine} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' },
  
  // Main Header (only one)
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1E21',
  },
  badge: {
    backgroundColor: '#5856D6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#5856D6',
    borderRadius: 20,
  },
  markAllText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // Floating Button
  floatingMarkAll: {
    position: 'absolute',
    top: 80,
    right: 16,
    zIndex: 100,
  },
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#5856D6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
    shadowColor: '#5856D6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  floatingButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Unread header
  unreadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  unreadHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5856D6',
    letterSpacing: 1,
  },
  unreadHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  
  // List
  listContent: { 
    paddingBottom: 80,
  },
  notificationWrapper: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  unread: {
    backgroundColor: '#FFFFFF',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1E21',
    flex: 1,
  },
  message: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 6,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    fontSize: 11,
    color: '#C6C6C8',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5856D6',
    marginLeft: 8,
  },
  
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8E8ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1E21',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
});