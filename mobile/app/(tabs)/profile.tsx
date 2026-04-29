import React, { useMemo, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList,
  SafeAreaView, StatusBar,
} from "react-native";
import { useAppSelector } from "../../src/redux/hooks";
import PostCard from "../../components/PostCard";

type Post = {
  _id: string;
  content: string;
  username: string;
  likes?: number;
  repostOf?: string | null;
};

const ACCENT = "#6C63FF";

export default function ProfileScreen() {
  const posts = useAppSelector((state) => state.posts.posts);
  const username = "anon_user";

  const userPosts = useMemo(
    () => posts.filter((p) => p.username === username),
    [posts]
  );

  const totalLikes = useMemo(
    () => userPosts.reduce((sum, p) => sum + (p.likes || 0), 0),
    [userPosts]
  );

  const avatarLetter = username.charAt(0).toUpperCase();

  const renderItem = useCallback(
    ({ item }: { item: Post }) => <PostCard post={item} />,
    []
  );

  const ListHeader = (
    <>
      {/* ── HERO BANNER ── */}
      <View style={styles.hero}>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroAvatarText}>{avatarLetter}</Text>
        </View>
        <Text style={styles.heroName}>{username}</Text>
        <Text style={styles.heroSub}>Anonymous user</Text>
      </View>

      {/* ── STATS CARD (floats over banner) ── */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{userPosts.length}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalLikes}</Text>
          <Text style={styles.statLabel}>Likes</Text>
        </View>
      </View>

      {/* ── SECTION LABEL ── */}
      {userPosts.length > 0 && (
        <Text style={styles.sectionLabel}>YOUR POSTS</Text>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={ACCENT} />

      <FlatList
        data={userPosts}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🚀</Text>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySub}>Start sharing your thoughts</Text>
          </View>
        }
        ListFooterComponent={
          userPosts.length > 0
            ? <Text style={styles.footer}>End of your posts ✨</Text>
            : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F5FA",
  },
  listContent: {
    paddingBottom: 100,
  },

  /* ── HERO ── */
  hero: {
    backgroundColor: ACCENT,
    paddingTop: 32,
    paddingBottom: 36,
    alignItems: "center",
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  heroAvatarText: {
    fontSize: 28,
    fontWeight: "800",
    color: ACCENT,
  },
  heroName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginTop: 3,
  },

  /* ── STATS CARD ── */
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 24,
    marginTop: -22,
    paddingVertical: 16,
    shadowColor: ACCENT,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: "#EAEAF0",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A2E",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: "#9999AA",
    marginTop: 2,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#EAEAF0",
    marginVertical: 4,
  },

  /* ── SECTION LABEL ── */
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9999AA",
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },

  /* ── EMPTY / FOOTER ── */
  emptyBox: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 6 },
  emptySub: { fontSize: 14, color: "#9999AA" },
  footer: {
    textAlign: "center",
    paddingVertical: 24,
    fontSize: 13,
    color: "#BBBBCC",
    fontWeight: "500",
  },
});