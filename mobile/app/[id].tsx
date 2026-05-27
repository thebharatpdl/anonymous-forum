import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppDispatch } from '../src/redux/hooks';
import { getToken, getCurrentUser } from '../services/authService';
import { followUserAsync, unfollowUserAsync } from '../src/redux/postsSlice';
import PostCard from '../components/PostCard';
import { Post } from '../src/redux/postsSlice';

import { API_URL } from '../src/config';

type UserProfile = {
  id: string;
  anonymousName: string;
  bio?: string;
  avatarColor?: string;
  createdAt: string;
};

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isCurrentUser, setIsCurrentUser] = useState(false);

  useEffect(() => {
    if (id) {
      fetchUserProfile();
      fetchUserPosts();
      getCurrentUserInfo();
    }
  }, [id]);

  const getCurrentUserInfo = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUserId(user.id);
        if (user.id === id) {
          setIsCurrentUser(true);
          setLoading(false);
        } else {
          await checkFollowStatus();
          await fetchFollowStats();
        }
      }
    } catch (error) {
      console.error('Error getting current user:', error);
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/users/status/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.isFollowing);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const fetchFollowStats = async () => {
    try {
      const token = await getToken();
      
      const followersRes = await fetch(`${API_URL}/users/followers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (followersRes.ok) {
        const followersData = await followersRes.json();
        setFollowersCount(followersData.count || followersData.followers?.length || 0);
      }
      
      const followingRes = await fetch(`${API_URL}/users/following/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (followingRes.ok) {
        const followingData = await followingRes.json();
        setFollowingCount(followingData.count || followingData.following?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching follow stats:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/auth/user/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const response = await fetch(`${API_URL}/posts`);
      if (response.ok) {
        const allPosts = await response.json();
        const filteredPosts = allPosts.filter((post: Post) => post.authorId === id);
        setUserPosts(filteredPosts);
      }
    } catch (error) {
      console.error('Error fetching user posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await dispatch(unfollowUserAsync(id)).unwrap();
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        await dispatch(followUserAsync(id)).unwrap();
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (error: any) {
      console.error('Follow error:', error);
      Alert.alert('Error', error.message || 'Failed to update follow status');
    }
  };

  const handleStartChat = () => {
    if (!user || !currentUserId) return;
    const roomId = [currentUserId, id].sort().join("-");
    router.push({
      pathname: '/chat',
      params: { 
        roomId, 
        otherUserId: id, 
        otherUserName: user.anonymousName 
      }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>User not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileContent}>
          <View style={[styles.avatar, { backgroundColor: (user.avatarColor || '#6C63FF') + '15' }]}>
            <Text style={[styles.avatarText, { color: user.avatarColor || '#6C63FF' }]}>
              {user.anonymousName?.[0]?.toUpperCase() || 'A'}
            </Text>
          </View>
          <Text style={styles.name}>{user.anonymousName}</Text>
          <Text style={styles.userId}>ID: {user.id?.slice(-8)}</Text>
          
          {user.bio ? (
            <Text style={styles.bio}>{user.bio}</Text>
          ) : (
            <Text style={styles.bioPlaceholder}>No bio yet</Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userPosts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>

          {!isCurrentUser && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.followingButton]}
                onPress={handleFollow}
              >
                <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.messageButton} onPress={handleStartChat}>
                <Ionicons name="chatbubble-outline" size={18} color="#6C63FF" />
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>Posts</Text>
          {userPosts.length === 0 ? (
            <View style={styles.noPostsContainer}>
              <Text style={styles.noPostsText}>No posts yet</Text>
            </View>
          ) : (
            userPosts.map((post) => (
              <PostCard key={post._id} post={post} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, backgroundColor: '#F8F9FC' },
  errorText: { fontSize: 16, color: '#666' },
  backBtnText: { color: '#6C63FF', fontSize: 14 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#EFEFF4' 
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  profileContent: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 40 },
  avatar: { 
    width: 100, height: 100, borderRadius: 50, 
    alignItems: 'center', justifyContent: 'center', 
    marginBottom: 16, borderWidth: 2, borderColor: '#6366F1' 
  },
  avatarText: { fontSize: 36, fontWeight: '600' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  userId: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
  bio: { fontSize: 14, color: '#374151', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  bioPlaceholder: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', marginBottom: 20 },
  
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 20,
    width: '100%',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#9CA3AF' },
  statDivider: { width: 1, height: 30, backgroundColor: '#E5E7EB' },
  
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 20,
  },
  followButton: {
    flex: 1,
    backgroundColor: '#6C63FF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#6C63FF',
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 8,
  },
  messageButtonText: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  postsSection: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  noPostsContainer: { alignItems: 'center', paddingVertical: 40 },
  noPostsText: { fontSize: 14, color: '#9CA3AF' },
});