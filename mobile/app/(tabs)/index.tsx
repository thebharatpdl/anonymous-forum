import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  StatusBar,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";

import { useAppDispatch, useAppSelector } from "../../src/redux/hooks";
import { fetchPosts } from "../../src/redux/postsSlice";

import PostCard from "../../components/PostCard";

type Post = {
  _id: string;
  content: string;
  username: string;
  likes?: number;
  repostOf?: string | null;
};

export default function HomeScreen() {
  // ✅ ONLY ONE dispatch (typed)
  const dispatch = useAppDispatch();

  // ✅ Redux state (typed selector)
  const { posts, loading } = useAppSelector((state) => state.posts);

  const [refreshing, setRefreshing] = React.useState(false);

  // 🚀 load posts
  useEffect(() => {
    dispatch(fetchPosts());
  }, []);

  // 🔄 refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchPosts());
    setRefreshing(false);
  }, []);

  // 📦 render item
  const renderItem = useCallback(
    ({ item }: { item: Post }) => <PostCard post={item} />,
    []
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5FA" />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Anonymous Feed</Text>
          <Text style={styles.headerSub}>
            {loading
              ? "Loading posts..."
              : posts.length > 0
              ? `${posts.length} posts`
              : "Share freely"}
          </Text>
        </View>
      </View>

      {/* FEED */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF4D6D"
            colors={["#FF4D6D"]}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF4D6D" />
              <Text style={styles.loadingText}>Loading feed...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🚀</Text>
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptySub}>
                Be the first to share something anonymous
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          posts.length > 0 ? (
            <Text style={styles.footer}>You're all caught up ✨</Text>
          ) : null
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: "#F5F5FA",
    borderBottomWidth: 1,
    borderBottomColor: "#EAEAF0",
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A2E",
  },

  headerSub: {
    fontSize: 12,
    color: "#9999AA",
    marginTop: 2,
  },

  listContent: {
    paddingTop: 14,
    paddingBottom: 32,
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
  },

  emptyEmoji: {
    fontSize: 52,
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 8,
  },

  emptySub: {
    fontSize: 14,
    color: "#9999AA",
    textAlign: "center",
    lineHeight: 20,
  },

  footer: {
    textAlign: "center",
    paddingVertical: 20,
    fontSize: 13,
    color: "#BBBBCC",
    fontWeight: "500",
  },

  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },

  loadingText: {
    marginTop: 10,
    color: "#999",
  },
});