import React, { useEffect, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet,
  StatusBar, RefreshControl, ActivityIndicator,
} from "react-native";
import { useAppDispatch, useAppSelector } from "../../src/redux/hooks";
import { fetchPosts } from "../../src/redux/postsSlice";
import PostCard from "../../components/PostCard";

import { SafeAreaView } from "react-native-safe-area-context";

type Post = {
  _id: string;
  content: string;
  username: string;
  likes?: number;
  repostOf?: string | null;
};

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const { posts, loading } = useAppSelector((state) => state.posts);
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => { dispatch(fetchPosts()); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchPosts());
    setRefreshing(false);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Post }) => <PostCard post={item} />,
    []
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5FA" />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Anonymous Feed</Text>
          <Text style={styles.headerSub}>
            {loading ? "Loading..." : posts.length > 0 ? `${posts.length} posts` : "Share freely"}
          </Text>
        </View>
        <View style={styles.globeBadge}>
          <Text style={styles.globeText}>🌐</Text>
        </View>
      </View>

      {/* ── FEED ── */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6C63FF"
            colors={["#6C63FF"]}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#6C63FF" />
              <Text style={styles.loadingText}>Loading feed...</Text>
            </View>
          ) : (
            <View style={styles.centerBox}>
              <Text style={styles.emptyEmoji}>🚀</Text>
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptySub}>Be the first to share something anonymous</Text>
            </View>
          )
        }
        ListFooterComponent={
          posts.length > 0
            ? <Text style={styles.footer}>You're all caught up ✨</Text>
            : null
        }
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={8}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F5FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
      paddingTop: 20, // ✅ ADD THIS

    paddingBottom: 14,
    backgroundColor: "#F5F5FA",
    borderBottomWidth: 1,
    borderBottomColor: "#EAEAF0",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A2E",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: "#9999AA",
    marginTop: 2,
    fontWeight: "500",
  },



  globeBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EAEAF0",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  globeText: { fontSize: 18 },
  listContent: { paddingTop: 12, paddingBottom: 100 },
  centerBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 50, marginBottom: 14 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#1A1A2E", marginBottom: 6 },
  emptySub: { fontSize: 14, color: "#9999AA", textAlign: "center", lineHeight: 20 },
  loadingText: { marginTop: 12, color: "#9999AA", fontSize: 14 },
  footer: {
    textAlign: "center",
    paddingVertical: 24,
    fontSize: 13,
    color: "#BBBBCC",
    fontWeight: "500",
  },
});