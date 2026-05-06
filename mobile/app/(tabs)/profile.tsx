import React, { useMemo, useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, StatusBar, TouchableOpacity,
  Share, Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppSelector } from "../../src/redux/hooks";
import PostCard from "../../components/PostCard";
import StatCard from "../../components/StatCard";
import AvatarBadge from "../../components/AvatarBadge";
import EmptyState from "../../components/EmptyState";
import { SafeAreaView } from "react-native-safe-area-context";


type Post = {
  _id: string;
  content: string;
  username: string;
  likes?: number;
  repostOf?: string | null;
};

type FilterType = "all" | "original" | "reposts";

const ACCENT = "#6C63FF";

export default function ProfileScreen() {
  const posts = useAppSelector((state) => state.posts.posts);
  const username = "anon_user";
  const [filter, setFilter] = useState<FilterType>("all");

  const userPosts = useMemo(
    () => posts.filter((p) => p.username === username),
    [posts]
  );

  const filteredPosts = useMemo(() => {
    if (filter === "original") return userPosts.filter((p) => !p.repostOf);
    if (filter === "reposts") return userPosts.filter((p) => !!p.repostOf);
    return userPosts;
  }, [userPosts, filter]);

  const totalLikes = useMemo(
    () => userPosts.reduce((sum, p) => sum + (p.likes || 0), 0),
    [userPosts]
  );

  const totalReposts = useMemo(
    () => userPosts.filter((p) => p.repostOf).length,
    [userPosts]
  );

  const handleShare = async () => {
    await Share.share({
      message: `Check out ${username}'s anonymous feed! 🌐`,
    });
  };

  const renderItem = useCallback(
    ({ item }: { item: Post }) => <PostCard post={item} />,
    []
  );

  const ListHeader = (
    <>
      {/* ── HERO ── */}
      <View style={styles.hero}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color="#fff" />
        </TouchableOpacity>

        <AvatarBadge username={username} size={80} />

        <Text style={styles.heroName}>{username}</Text>
        <Text style={styles.heroSub}>Anonymous · Since forever</Text>

        {/* ── STATS ROW ── */}
        <View style={styles.statsRow}>
          <StatCard value={userPosts.length} label="Posts" />
          <View style={styles.statSep} />
          <StatCard value={totalLikes} label="Likes" />
          <View style={styles.statSep} />
          <StatCard value={totalReposts} label="Reposts" />
        </View>
      </View>

      {/* ── FILTER TABS ── */}
      <View style={styles.filterRow}>
        {(["all", "original", "reposts"] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterLabel, filter === f && styles.filterLabelActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={ACCENT} />

      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyState
            emoji="🚀"
            title={filter === "reposts" ? "No reposts yet" : "No posts yet"}
            subtitle={
              filter === "reposts"
                ? "Repost something from the feed"
                : "Start sharing your thoughts anonymously"
            }
          />
        }
        ListFooterComponent={
          filteredPosts.length > 0
            ? <Text style={styles.footer}>End of your posts ✨</Text>
            : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F5F5FA" },
  listContent: { paddingBottom: 100 },

  hero: {
    backgroundColor: ACCENT,
    paddingTop: 20,
    paddingBottom: 28,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  shareBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginTop: 10,
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginTop: 4,
    marginBottom: 20,
  },

  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    width: "100%",
  },
  statSep: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginVertical: 4,
  },

  filterRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: "#EEEEF8",
    borderRadius: 12,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },
  filterTabActive: {
    backgroundColor: "#fff",
    shadowColor: ACCENT,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9999AA",
  },
  filterLabelActive: {
    color: ACCENT,
  },

  footer: {
    textAlign: "center",
    paddingVertical: 24,
    fontSize: 13,
    color: "#BBBBCC",
    fontWeight: "500",
  },
});