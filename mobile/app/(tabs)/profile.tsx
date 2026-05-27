import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Share,
  Animated,
  Platform,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector, useAppDispatch } from '../../src/redux/hooks';
import { useRouter, useFocusEffect } from 'expo-router';
import { getCurrentUser, User, logout, getToken } from '../../services/authService';
import EditProfileModal from '../../components/EditProfileModal';
import PostCard from '../../components/PostCard';
import { Post } from '../../src/redux/postsSlice';
import axios from 'axios';
import { API_URL } from '../../src/config';

const { width, height } = Dimensions.get('window');

function getGradient(name: string): [string, string, string] {
  const palettes: [string, string, string][] = [
    ['#6C63FF', '#8B5CF6', '#A78BFA'],
    ['#F43F5E', '#E11D48', '#FB7185'],
    ['#10B981', '#059669', '#34D399'],
    ['#F59E0B', '#D97706', '#FCD34D'],
    ['#3B82F6', '#2563EB', '#60A5FA'],
    ['#EC4899', '#DB2777', '#F9A8D4'],
    ['#14B8A6', '#0D9488', '#5EEAD4'],
    ['#8B5CF6', '#7C3AED', '#C4B5FD'],
  ];
  const idx = (name.charCodeAt(0) + name.charCodeAt(1 % name.length)) % palettes.length;
  return palettes[idx];
}

function StatItem({ value, label, onPress }: { value: number; label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.statItem} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const ThreeDotsMenu = ({ visible, onClose, onEditProfile, onShare, onLogout, colors }: any) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const menuItems = [
    { icon: 'create-outline' as const, label: 'Edit Profile', color: colors[0], onPress: onEditProfile },
    { icon: 'share-social-outline' as const, label: 'Share Profile', color: '#6B7280', onPress: onShare },
    { icon: 'log-out-outline' as const, label: 'Logout', color: '#EF4444', onPress: onLogout },
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[styles.menuContainer, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>Menu</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#8E8E93" />
            </TouchableOpacity>
          </View>
          <View style={styles.menuDivider} />
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => {
                onClose();
                setTimeout(() => item.onPress(), 100);
              }}
            >
              <View style={[styles.menuIconBg, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={[styles.menuLabel, { color: item.color }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#C6C6C8" />
            </TouchableOpacity>
          ))}
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const FollowModal = ({ visible, onClose, title, users, colors }: any) => {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.followModalContainer}>
          <View style={styles.followModalHeader}>
            <Text style={styles.followModalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1C1E21" />
            </TouchableOpacity>
          </View>
          <View style={styles.followModalDivider} />
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.followUserItem}>
                <View style={[styles.followAvatar, { backgroundColor: colors[0] + '20' }]}>
                  <Text style={[styles.followAvatarText, { color: colors[0] }]}>
                    {(item.anonymousName || item.name || 'A')[0].toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.followUserName}>{item.anonymousName || item.name || 'Anonymous'}</Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.followEmpty}>
                <Text style={styles.followEmptyText}>No {title.toLowerCase()} yet</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { posts } = useAppSelector((state) => state.posts);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [followModalTitle, setFollowModalTitle] = useState('');
  const [followModalUsers, setFollowModalUsers] = useState([]);

  const loadAllData = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      setCurrentUser(user);

      const token = await getToken();

      try {
        const followersRes = await axios.get(`${API_URL}/users/followers/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const followersData = followersRes.data;
        setFollowersCount(followersData.count || followersData.followers?.length || 0);
        setFollowersList(followersData.followers || []);
      } catch (e: any) {
        console.log('Followers fetch failed:', e.response?.status || e.message);
      }

      try {
        const followingRes = await axios.get(`${API_URL}/users/following/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const followingData = followingRes.data;
        setFollowingCount(followingData.count || followingData.following?.length || 0);
        setFollowingList(followingData.following || []);
      } catch (e: any) {
        console.log('Following fetch failed:', e.response?.status || e.message);
      }

    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSavedPosts = useCallback(async () => {
    setSavedLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setSavedPosts([]);
        return;
      }

      const res = await axios.get(`${API_URL}/posts/saved`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      let postsArray: Post[] = [];
      if (Array.isArray(res.data)) {
        postsArray = res.data;
      } else if (res.data.posts) {
        postsArray = res.data.posts;
      }

      setSavedPosts(postsArray);

    } catch (error: any) {
      console.error('Failed to load saved posts:', error.response?.status);
      setSavedPosts([]);
    } finally {
      setSavedLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAllData();
      loadSavedPosts();
    }, [loadAllData, loadSavedPosts])
  );

  const handleTabSwitch = (idx: number) => {
    setActiveTab(idx);
    if (idx === 1) loadSavedPosts();
  };

  const handleShowFollowers = () => {
    setFollowModalTitle('Followers');
    setFollowModalUsers(followersList);
    setFollowModalVisible(true);
  };

  const handleShowFollowing = () => {
    setFollowModalTitle('Following');
    setFollowModalUsers(followingList);
    setFollowModalVisible(true);
  };

  const myPosts = posts.filter((p) => p.username === currentUser?.anonymousName);
  const colors = getGradient(currentUser?.anonymousName || 'A');

  const handleShare = () => {
    Share.share({ message: `I'm ${currentUser?.anonymousName} on Whispr — the anonymous social app!` });
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  const data = activeTab === 0 ? myPosts : savedPosts;
  const isLoading = activeTab === 0 ? false : savedLoading;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5FB" />

      <View style={[styles.stickyTopBar, { backgroundColor: '#FFFFFF' }]}>
        <View style={styles.stickyHeaderCenter}>
          <Text style={styles.stickyUsername}>
            @{(currentUser?.anonymousName || 'anonymous').toLowerCase()}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.stickyMenuButton}
          onPress={() => setMenuVisible(true)}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color="#000000" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 14, marginBottom: 8 }}>
            <PostCard post={item} />
          </View>
        )}
        contentContainerStyle={styles.scrollableContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={[styles.banner, { backgroundColor: colors[0] + '12' }]} />
            <View style={styles.profileCard}>
              <View style={styles.avatarWrap}>
                <LinearGradient colors={colors} style={styles.avatarRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <View style={styles.avatarInner}>
                    <Text style={[styles.avatarLetter, { color: colors[0] }]}>
                      {(currentUser?.anonymousName || 'A')[0].toUpperCase()}
                    </Text>
                  </View>
                </LinearGradient>
                <View style={styles.onlineBadge} />
              </View>
              <Text style={styles.name}>{currentUser?.anonymousName || 'Anonymous'}</Text>
              {currentUser?.bio ? (
                <Text style={styles.bio}>{currentUser.bio}</Text>
              ) : (
                <TouchableOpacity onPress={() => setEditModalVisible(true)} activeOpacity={0.7}>
                  <Text style={styles.bioEmpty}>+ Add a bio</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.idChip, { backgroundColor: colors[0] + '08', borderColor: colors[0] + '20' }]} activeOpacity={0.7}>
                <Ionicons name="finger-print-outline" size={11} color="#9CA3AF" />
                <Text style={styles.idText}>ID · {currentUser?.id?.slice(-10).toUpperCase() || '----------'}</Text>
              </TouchableOpacity>
              <View style={styles.statsRow}>
                <StatItem value={myPosts.length} label="Posts" />
                <View style={styles.statDivider} />
                <StatItem value={followersCount} label="Followers" onPress={handleShowFollowers} />
                <View style={styles.statDivider} />
                <StatItem value={followingCount} label="Following" onPress={handleShowFollowing} />
              </View>
            </View>
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 0 && styles.activeTab]}
                onPress={() => handleTabSwitch(0)}
                activeOpacity={0.8}
              >
                <Ionicons name="apps-outline" size={15} color={activeTab === 0 ? colors[0] : '#D1D5DB'} />
                <Text style={[styles.tabText, activeTab === 0 && { color: colors[0] }]}>Posts</Text>
                {activeTab === 0 && <View style={[styles.activeTabIndicator, { backgroundColor: colors[0] }]} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 1 && styles.activeTab]}
                onPress={() => handleTabSwitch(1)}
                activeOpacity={0.8}
              >
                <Ionicons name="bookmark-outline" size={15} color={activeTab === 1 ? colors[0] : '#D1D5DB'} />
                <Text style={[styles.tabText, activeTab === 1 && { color: colors[0] }]}>Saved</Text>
                {activeTab === 1 && <View style={[styles.activeTabIndicator, { backgroundColor: colors[0] }]} />}
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#6C63FF" />
              <Text style={styles.emptyText}>Loading…</Text>
            </View>
          ) : activeTab === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors[0] + '15' }]}>
                <Ionicons name="create-outline" size={36} color={colors[0]} />
              </View>
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptySub}>Share your first anonymous thought</Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors[0] }]}
                onPress={() => router.push('/add_post')}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle-outline" size={15} color="#fff" />
                <Text style={styles.emptyBtnText}>Create First Post</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors[0] + '15' }]}>
                <Ionicons name="bookmark-outline" size={36} color={colors[0]} />
              </View>
              <Text style={styles.emptyTitle}>No saved posts</Text>
              <Text style={styles.emptySub}>Save posts to see them here</Text>
            </View>
          )
        }
      />

      <EditProfileModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onUpdate={(u) => setCurrentUser(u)}
      />

      <ThreeDotsMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onEditProfile={() => setEditModalVisible(true)}
        onShare={handleShare}
        onLogout={handleLogout}
        colors={colors}
      />

      <FollowModal
        visible={followModalVisible}
        onClose={() => setFollowModalVisible(false)}
        title={followModalTitle}
        users={followModalUsers}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5FB' },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5FB' },
  centerContent: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, color: '#9CA3AF', fontSize: 14 },
  stickyTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 50,
    paddingBottom: 8, backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  stickyHeaderCenter: { flex: 1, alignItems: 'center' },
  stickyUsername: { fontSize: 16, fontWeight: '600', color: '#000000', letterSpacing: 0.3 },
  stickyMenuButton: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
  },
  scrollableContent: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 5 : 95,
    paddingBottom: 100,
  },
  banner: { height: 60, overflow: 'hidden', position: 'relative', marginTop: 0 },
  profileCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 14, marginTop: -22,
    borderRadius: 18, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#F0F0F8',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  avatarWrap: { marginBottom: 6, position: 'relative' },
  avatarRing: { width: 60, height: 60, borderRadius: 18, padding: 2, alignItems: 'center', justifyContent: 'center' },
  avatarInner: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 24, fontWeight: '800' },
  onlineBadge: {
    position: 'absolute', bottom: 1, right: 1, width: 10, height: 10,
    borderRadius: 5, backgroundColor: '#10B981', borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  name: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 3 },
  bio: { fontSize: 11, color: '#4B5563', lineHeight: 16, textAlign: 'center', marginBottom: 6, paddingHorizontal: 6 },
  bioEmpty: { fontSize: 11, color: '#C4C4D4', fontStyle: 'italic', marginBottom: 6 },
  idChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14,
    borderWidth: 1, marginBottom: 10,
  },
  idText: { fontSize: 9, color: '#9CA3AF', fontFamily: 'monospace', fontWeight: '600' },
  statsRow: {
    flexDirection: 'row', width: '100%', backgroundColor: '#F9FAFB',
    borderRadius: 12, paddingVertical: 8, marginBottom: 0,
    borderWidth: 1, borderColor: '#F0F0F8',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 1 },
  statLabel: { fontSize: 9, color: '#9CA3AF', fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  statDivider: { width: 1, backgroundColor: '#EBEBF5', marginVertical: 4 },
  tabBar: {
    flexDirection: 'row', marginHorizontal: 14, marginTop: 12, marginBottom: 10,
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1,
    borderColor: '#F0F0F8', overflow: 'hidden',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, position: 'relative',
  },
  activeTab: { backgroundColor: '#F9FAFB' },
  activeTabIndicator: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 2.5, borderTopLeftRadius: 2, borderTopRightRadius: 2,
  },
  tabText: { fontSize: 12, fontWeight: '600', color: '#D1D5DB' },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 84, height: 84, borderRadius: 26, alignItems: 'center',
    justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 22,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  menuContainer: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  menuHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  menuTitle: { fontSize: 18, fontWeight: '700', color: '#1C1E21' },
  menuDivider: { height: 1, backgroundColor: '#F0F0F8' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 14 },
  menuIconBg: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
  followModalContainer: {
    flex: 1, backgroundColor: '#FFFFFF', marginTop: 100,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  followModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  followModalTitle: { fontSize: 18, fontWeight: '700', color: '#1C1E21' },
  followModalDivider: { height: 1, backgroundColor: '#F0F0F8' },
  followUserItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  followAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  followAvatarText: { fontSize: 18, fontWeight: '700' },
  followUserName: { fontSize: 16, fontWeight: '500', color: '#1C1E21' },
  followEmpty: { alignItems: 'center', paddingVertical: 40 },
  followEmptyText: { fontSize: 14, color: '#8E8E93' },
});