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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector, useAppDispatch } from '../../src/redux/hooks';
import { useRouter, useFocusEffect } from 'expo-router';
import { getCurrentUser, User, logout, getToken } from '../../services/authService';
import EditProfileModal from '../../components/EditProfileModal';
import PostCard from '../../components/PostCard';
import { Post } from '../../src/redux/postsSlice';

const { width } = Dimensions.get('window');
const API_URL = 'http://192.168.1.69:5000/api';

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
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <TouchableOpacity style={styles.statItem} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <Animated.Text style={[styles.statNumber, { opacity, transform: [{ scale }] }]}>
        {value}
      </Animated.Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { posts } = useAppSelector((state) => state.posts);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const scrollY = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;

  // ✅ Combined data loading - prevents blinking
  const loadAllData = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      
      setCurrentUser(user);
      
      // Fetch follow stats in parallel
      const token = await getToken();
      const [followersRes, followingRes] = await Promise.all([
        fetch(`${API_URL}/users/followers/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/users/following/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      
      const followersData = await followersRes.json();
      const followingData = await followingRes.json();
      
      setFollowersCount(followersData.count || followersData.followers?.length || 0);
      setFollowingCount(followingData.count || followingData.following?.length || 0);
      
      // Start animations after data is loaded
      Animated.parallel([
        Animated.spring(avatarScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start();
      
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadAllData();
      if (activeTab === 1) {
        fetchSavedPosts();
      }
    }, [activeTab])
  );

  const fetchSavedPosts = async () => {
    setSavedLoading(true);
    try {
      const token = await getToken();
      const user = await getCurrentUser();
      if (!user) return;
      
      const response = await fetch(`${API_URL}/posts/saved`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setSavedPosts(data);
    } catch (error) {
      console.error('Error fetching saved posts:', error);
    } finally {
      setSavedLoading(false);
    }
  };

  const myPosts = posts.filter((p) => p.username === currentUser?.anonymousName);
  const colors = getGradient(currentUser?.anonymousName || 'A');

  const handleShare = () =>
    Share.share({ message: `I'm ${currentUser?.anonymousName} on EchoVoice — the anonymous social app!` });

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const renderHeader = () => (
    <>
      <Animated.View style={{ transform: [{ translateY: scrollY.interpolate({ inputRange: [0, 150], outputRange: [0, -50], extrapolate: 'clamp' }) }] }}>
        <LinearGradient
          colors={[colors[0] + 'AA', colors[1] + '66', colors[2] + '22']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={[styles.blob, { top: -40, right: -40, width: 160, height: 160, backgroundColor: colors[0] + '25' }]} />
          <View style={[styles.blob, { top: 20, right: 80, width: 80, height: 80, backgroundColor: colors[2] + '20' }]} />
          <View style={[styles.blob, { bottom: -30, left: -30, width: 120, height: 120, backgroundColor: colors[1] + '18' }]} />
        </LinearGradient>
      </Animated.View>

      <Animated.View style={[styles.profileCard, { opacity: headerFade }]}>
        <View style={styles.avatarWrap}>
          <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
            <LinearGradient colors={colors} style={styles.avatarRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.avatarInner}>
                <Text style={[styles.avatarLetter, { color: colors[0] }]}>
                  {(currentUser?.anonymousName || 'A')[0].toUpperCase()}
                </Text>
              </View>
            </LinearGradient>
            <View style={styles.onlineBadge} />
          </Animated.View>
        </View>

        <Text style={styles.name}>{currentUser?.anonymousName || 'Anonymous'}</Text>
        <View style={styles.handleRow}>
          <Ionicons name="at" size={13} color="#9CA3AF" />
          <Text style={styles.handle}>{(currentUser?.anonymousName || 'anonymous').toLowerCase()}</Text>
          <View style={[styles.verifiedBadge, { backgroundColor: colors[0] + '15', borderColor: colors[0] + '40' }]}>
            <Ionicons name="shield-checkmark" size={10} color={colors[0]} />
          </View>
        </View>

        {currentUser?.bio ? (
          <Text style={styles.bio}>{currentUser.bio}</Text>
        ) : (
          <TouchableOpacity onPress={() => setEditModalVisible(true)}>
            <Text style={styles.bioEmpty}>+ Add a bio</Text>
          </TouchableOpacity>
        )}

        <View style={styles.statsRow}>
          <StatItem value={myPosts.length} label="Posts" />
          <View style={styles.statDivider} />
          <StatItem value={followersCount} label="Followers" />
          <View style={styles.statDivider} />
          <StatItem value={followingCount} label="Following" />
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setEditModalVisible(true)} activeOpacity={0.85}>
            <LinearGradient colors={[colors[0], colors[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
              <Ionicons name="create-outline" size={16} color="#fff" />
              <Text style={styles.btnPrimaryText}>Edit Profile</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btnSecondary, { borderColor: colors[0] + '50' }]} onPress={() => router.push('/chatlist')} activeOpacity={0.85}>
            <Ionicons name="chatbubbles-outline" size={16} color={colors[0]} />
            <Text style={[styles.btnSecondaryText, { color: colors[0] }]}>Chats</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btnIcon, { backgroundColor: colors[0] + '12', borderColor: colors[0] + '30' }]} onPress={handleShare} activeOpacity={0.85}>
            <Ionicons name="share-social-outline" size={18} color={colors[0]} />
          </TouchableOpacity>
        </View>

        <View style={[styles.idBadge, { backgroundColor: colors[0] + '08' }]}>
          <Ionicons name="finger-print-outline" size={12} color="#9CA3AF" />
          <Text style={styles.idText}>ID · {currentUser?.id?.slice(-10).toUpperCase() || '----------'}</Text>
        </View>

        <TouchableOpacity style={styles.permanentLogoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.permanentLogoutText}>Sign Out</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 0 && { borderBottomColor: colors[0] }]} onPress={() => setActiveTab(0)}>
          <Ionicons name="apps" size={18} color={activeTab === 0 ? colors[0] : '#D1D5DB'} />
          <Text style={[styles.tabText, activeTab === 0 && { color: colors[0] }]}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 1 && { borderBottomColor: colors[0] }]} onPress={() => setActiveTab(1)}>
          <Ionicons name="bookmark" size={18} color={activeTab === 1 ? colors[0] : '#D1D5DB'} />
          <Text style={[styles.tabText, activeTab === 1 && { color: colors[0] }]}>Saved</Text>
        </TouchableOpacity>
      </View>
    </>
  );

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
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <EditProfileModal visible={editModalVisible} onClose={() => setEditModalVisible(false)} onUpdate={(u) => setCurrentUser(u)} />

      <Animated.View style={[styles.stickyHeader, { backgroundColor: scrollY.interpolate({ inputRange: [0, 60, 100], outputRange: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.85)', 'rgba(255,255,255,0.98)'], extrapolate: 'clamp' }) }]}>
        <Animated.Text style={[styles.stickyTitle, { opacity: scrollY.interpolate({ inputRange: [60, 100], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>
          @{(currentUser?.anonymousName || 'anonymous').toLowerCase()}
        </Animated.Text>
        <View style={styles.stickyActions}>
          <TouchableOpacity style={styles.stickyBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.stickyBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#F43F5E" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <FlatList
        data={data}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <PostCard post={item} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#6C63FF" />
              <Text style={styles.emptyText}>Loading saved posts...</Text>
            </View>
          ) : activeTab === 0 ? (
            <View style={styles.emptyState}>
              <LinearGradient colors={[colors[0] + '20', colors[1] + '10']} style={styles.emptyIconWrap}>
                <Ionicons name="create-outline" size={40} color={colors[0]} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptySub}>Share your first anonymous thought with the world</Text>
              <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors[0] }]} onPress={() => router.push('/add_post')}>
                <Text style={styles.emptyBtnText}>Create First Post</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <LinearGradient colors={[colors[0] + '20', colors[1] + '10']} style={styles.emptyIconWrap}>
                <Ionicons name="bookmark-outline" size={40} color={colors[0]} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No saved posts</Text>
              <Text style={styles.emptySub}>Posts you save will appear here</Text>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 44 },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, color: '#9CA3AF', fontSize: 14 },
  listContent: { paddingBottom: 100 },

  stickyHeader: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight : 44,
    left: 0, right: 0, zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stickyTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  stickyActions: { flexDirection: 'row', gap: 8 },
  stickyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(243,244,246,0.9)', alignItems: 'center', justifyContent: 'center' },

  banner: { height: 140, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999 },

  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    marginTop: -30,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },

  avatarWrap: { marginBottom: 14, position: 'relative' },
  avatarRing: { width: 94, height: 94, borderRadius: 47, padding: 3, alignItems: 'center', justifyContent: 'center' },
  avatarInner: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 38, fontWeight: '800' },
  onlineBadge: { position: 'absolute', bottom: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#10B981', borderWidth: 3, borderColor: '#FFFFFF' },

  name: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  handleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  handle: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, borderWidth: 1, marginLeft: 4 },

  bio: { fontSize: 13, color: '#4B5563', lineHeight: 19, textAlign: 'center', marginBottom: 14, paddingHorizontal: 8 },
  bioEmpty: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 14 },

  statsRow: {
    flexDirection: 'row', width: '100%',
    backgroundColor: '#F9FAFB', borderRadius: 16,
    paddingVertical: 14, marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  statDivider: { width: 1, backgroundColor: '#E5E7EB', marginVertical: 6 },

  btnRow: { flexDirection: 'row', gap: 8, width: '100%', marginBottom: 12 },
  btnPrimary: { flex: 1.6, borderRadius: 12, overflow: 'hidden' },
  btnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, backgroundColor: '#FAFAFA' },
  btnSecondaryText: { fontSize: 14, fontWeight: '700' },
  btnIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },

  idBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  idText: { fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', fontWeight: '600' },

  permanentLogoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#FEE2E2', backgroundColor: '#FEF2F2',
    marginTop: 20, marginBottom: 10,
  },
  permanentLogoutText: { fontSize: 16, fontWeight: '600', color: '#EF4444' },

  tabBar: { flexDirection: 'row', marginHorizontal: 14, marginTop: 16, marginBottom: 2, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#D1D5DB' },

  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 40 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  emptyBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 22 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});