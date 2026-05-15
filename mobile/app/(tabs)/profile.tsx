import React, { useRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  ScrollView,
  View,
  TouchableOpacity,
  Text,
  Animated,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../src/redux/hooks';
import { useRouter } from 'expo-router';
import { getCurrentUser, User } from '../../services/authService';
import { logout } from '../../services/authService';

const { width } = Dimensions.get('window');

// ─── Stat Tile Component ─────────────────────────────────────────────────────
function StatTile({
  icon,
  value,
  label,
  delay,
  accent = '#6366F1',
}: {
  icon: string;
  value: string;
  label: string;
  delay: number;
  accent?: string;
}) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);
  
  return (
    <Animated.View style={[styles.statTile, { opacity: fade, transform: [{ translateY: slide }] }]}>
      <View style={[styles.statTileIconWrap, { borderColor: accent + '40', backgroundColor: accent + '10' }]}>
        <Ionicons name={icon as any} size={22} color={accent} />
      </View>
      <Text style={[styles.statTileValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statTileLabel}>{label}</Text>
    </Animated.View>
  );
}

// ─── Recent Post Card ────────────────────────────────────────────────────────
function RecentPostCard({ post, index }: { post: any; index: number }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);
  
  return (
    <Animated.View style={[styles.postCard, { opacity: fade, transform: [{ translateY: slide }] }]}>
      <View style={styles.postCardHeader}>
        <Text style={styles.postCardIndex}>#{String(index + 1).padStart(2, '0')}</Text>
        <Text style={styles.postCardDate}>
          {new Date(post.createdAt || Date.now()).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.postCardContent} numberOfLines={2}>
        {post.content}
      </Text>
      <View style={styles.postCardFooter}>
        <View style={styles.postCardStat}>
          <Ionicons name="heart-outline" size={14} color="#F43F5E" />
          <Text style={styles.postCardStatText}>{post.likes || 0} likes</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Main Profile Screen ─────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const { posts } = useAppSelector((state) => state.posts);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Get current user from auth
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const user = await getCurrentUser();
    setCurrentUser(user);
    setLoading(false);
  };

  // Filter posts by current user's anonymous name
  const myPosts = posts.filter((p) => p.username === currentUser?.anonymousName);
  const totalLikes = myPosts.reduce((s, p) => s + (p.likes || 0), 0);
  const topPost = myPosts.length
    ? myPosts.reduce((b, p) => ((p.likes || 0) > (b.likes || 0) ? p : b), myPosts[0])
    : null;

  // Stats for display
  const stats = [
    { label: 'Posts', value: myPosts.length.toString(), icon: 'chatbubble-outline', accent: '#6366F1' },
    { label: 'Likes', value: totalLikes.toString(), icon: 'heart-outline', accent: '#F43F5E' },
    { label: 'Top Post', value: topPost ? `${topPost.likes || 0}` : '0', icon: 'trophy-outline', accent: '#F59E0B' },
  ];

  // Header animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const bannerScale = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(headerSlide, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
      Animated.spring(bannerScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FC" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ── TOP NAV ── */}
        <View style={styles.topNav}>
          <View style={styles.topNavLeft}>
            <View style={styles.signalDot} />
            <Text style={styles.topNavText}>PROFILE</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.topNavBtn}>
            <Ionicons name="log-out-outline" size={20} color="#6366F1" />
          </TouchableOpacity>
        </View>

        {/* ── HERO SECTION ── */}
        <Animated.View
          style={[
            styles.heroSection,
            { opacity: headerFade, transform: [{ scale: bannerScale }, { translateY: headerSlide }] },
          ]}
        >
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarOuter}>
              <View style={styles.avatarInner}>
                <Ionicons name="person" size={42} color="#6366F1" />
              </View>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
            </View>
          </View>

          {/* Identity - SHOWING REAL ANONYMOUS NAME FROM BACKEND */}
          <View style={styles.identityBlock}>
            <Text style={styles.identityName}>{currentUser?.anonymousName || 'Anonymous User'}</Text>
            <Text style={styles.identityId}>ID: {currentUser?.id?.slice(-8) || '------'}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                <Text style={styles.badgeText}>Anonymous</Text>
              </View>
              <View style={[styles.badge, styles.badgeLive]}>
                <Ionicons name="radio" size={10} color="#6366F1" />
                <Text style={[styles.badgeText, { color: '#6366F1' }]}>Live</Text>
              </View>
            </View>
          </View>

          {/* Bio */}
          <View style={styles.bioBox}>
            <Text style={styles.bioText}>
              Sharing thoughts and ideas anonymously. Every voice matters in this community.
            </Text>
          </View>
        </Animated.View>

        {/* ── STATS SECTION ── */}
        <View style={styles.statsHeader}>
          <Text style={styles.statsLabel}>Statistics</Text>
          <View style={styles.statsLine} />
        </View>

        <View style={styles.statGrid}>
          {stats.map((stat, index) => (
            <StatTile
              key={index}
              icon={stat.icon}
              value={stat.value}
              label={stat.label}
              delay={100 + index * 80}
              accent={stat.accent}
            />
          ))}
        </View>

        {/* ── ACTION BUTTONS ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtnOutline} onPress={() => router.push('/')}>
            <Ionicons name="home-outline" size={18} color="#6366F1" />
            <Text style={styles.actionBtnOutlineText}>Feed</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnSolid} onPress={() => router.push('/add_post')}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnSolidText}>New Post</Text>
          </TouchableOpacity>
        </View>

        {/* ── RECENT POSTS ── */}
        <View style={styles.postsHeader}>
          <Text style={styles.postsLabel}>Recent Posts</Text>
          <View style={styles.postsLine} />
        </View>

        {myPosts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="create-outline" size={48} color="#C7D2FE" />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySubtitle}>Share your first anonymous thought</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/add_post')}>
              <Text style={styles.emptyButtonText}>Create Post</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.postsGrid}>
            {myPosts.slice(0, 4).map((post, i) => (
              <RecentPostCard key={post._id} post={post} index={i} />
            ))}
            {myPosts.length > 4 && (
              <TouchableOpacity style={styles.viewAllButton} onPress={() => router.push('/')}>
                <Text style={styles.viewAllText}>View all posts</Text>
                <Ionicons name="arrow-forward" size={16} color="#6366F1" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── PRIVACY CARD ── */}
        <View style={styles.privacyCard}>
          <View style={styles.privacyIconWrap}>
            <Ionicons name="shield-checkmark" size={24} color="#10B981" />
          </View>
          <View style={styles.privacyBody}>
            <Text style={styles.privacyTitle}>Your Privacy is Protected</Text>
            <Text style={styles.privacyText}>
              Your identity remains completely anonymous. No personal information is ever shared.
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
  },

  // Top nav
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  topNavLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  signalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  topNavText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  topNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Hero section
  heroSection: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  // Avatar
  avatarContainer: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  avatarOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },

  // Identity
  identityBlock: { 
    alignItems: 'center', 
    marginBottom: 12 
  },
  identityName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  identityId: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  badgeRow: { 
    flexDirection: 'row', 
    gap: 8 
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  badgeLive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  badgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },

  // Bio
  bioBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
  },
  bioText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    textAlign: 'center',
  },

  // Stats section
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
    gap: 10,
  },
  statsLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  statsLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  statTile: {
    width: (width - 48) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 16,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statTileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statTileValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statTileLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#6366F1',
    backgroundColor: '#FFFFFF',
  },
  actionBtnOutlineText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  actionBtnSolid: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBtnSolidText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Posts section
  postsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 12,
    gap: 10,
  },
  postsLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  postsLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  postsGrid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  postCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  postCardIndex: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  postCardDate: {
    color: '#D1D5DB',
    fontSize: 10,
  },
  postCardContent: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  postCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  postCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postCardStatText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
  },
  viewAllText: {
    color: '#6366F1',
    fontSize: 13,
    fontWeight: '600',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 48,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  emptyTitle: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#6366F1',
    borderRadius: 20,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // Privacy card
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  privacyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyBody: { 
    flex: 1 
  },
  privacyTitle: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  privacyText: {
    color: '#6B7280',
    fontSize: 11,
    lineHeight: 16,
  },
});