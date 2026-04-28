import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet,
  StatusBar, RefreshControl, SafeAreaView,
} from "react-native";
import axios from "axios";
import PostCard from "../../components/PostCard";
import { API_URL } from "../../src/config";
import { useFeed } from "../../context/FeedContext";

type Post = {
  _id: string;
  content: string;
  username: string;
  likes?: number;
  repostOf?: string | null;
};

export default function HomeScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { onRefresh: onFeedRefresh } = useFeed();

  const fetchPosts = async () => {
    try {
      const response = await axios.get(API_URL);
      setPosts(response.data);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, []);

  // ✅ Register fetchPosts so CreatePostScreen can trigger it
  useEffect(() => {
    onFeedRefresh(fetchPosts);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Post }) => <PostCard post={item} />,
    []
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5FA" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Anonymous Feed</Text>
          <Text style={styles.headerSub}>
            {posts.length > 0 ? `${posts.length} posts` : "Share freely"}
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>🌐</Text>
        </View>
      </View>
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
            tintColor="#FF4D6D"
            colors={["#FF4D6D"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🚀</Text>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySub}>Be the first to share something anonymous</Text>
          </View>
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
  safeArea: { flex: 1, backgroundColor: "#F5F5FA" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    backgroundColor: "#F5F5FA", borderBottomWidth: 1, borderBottomColor: "#EAEAF0",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#1A1A2E", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: "#9999AA", marginTop: 2, fontWeight: "500" },
  headerBadge: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  headerBadgeText: { fontSize: 20 },
  listContent: { paddingTop: 14, paddingBottom: 32 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingTop: 80, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#1A1A2E", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#9999AA", textAlign: "center", lineHeight: 20 },
  footer: { textAlign: "center", paddingVertical: 20, fontSize: 13, color: "#BBBBCC", fontWeight: "500" },
});