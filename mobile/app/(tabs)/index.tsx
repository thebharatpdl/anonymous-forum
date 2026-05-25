import React, { useEffect, useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Keyboard,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useAppDispatch, useAppSelector } from "../../src/redux/hooks";
import {
  fetchPosts,
  addNewPostRealtime,
  updateLikeRealtime,
  setSocketConnected,
  Post,
} from "../../src/redux/postsSlice";
import PostCard from "../../components/PostCard";
import socketService from "../../services/socket";
import { getUserId, getToken } from "../../services/authService";

const INITIAL_NUM_TO_RENDER = 8;
const MAX_TO_RENDER_PER_BATCH = 10;
const WINDOW_SIZE = 10;

// Pill topics for the trending row
// const TRENDING_TOPICS = ["anonymous", "confessions", "rant", "opinions", "advice", "stories"];

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { posts, loading, isConnected } = useAppSelector((state) => state.posts);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => {});
    const hide = Keyboard.addListener("keyboardDidHide", () => {});
    return () => { show.remove(); hide.remove(); };
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const response = await fetch("http://192.168.1.69:5000/api/notifications/unread-count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const handleNewNotification = () => fetchUnreadCount();
    socketService.on("new_notification", handleNewNotification);
    return () => { socketService.off("new_notification", handleNewNotification); };
  }, [fetchUnreadCount]);

  const getCurrentUserId = useCallback(async () => (await getUserId()) || "", []);
  const handleNewPost = useCallback((p: Post) => dispatch(addNewPostRealtime(p)), [dispatch]);
  const handleLikeUpdate = useCallback((d: { postId: string; likes: number }) => dispatch(updateLikeRealtime(d)), [dispatch]);
  const handleConnect = useCallback(() => dispatch(setSocketConnected(true)), [dispatch]);
  const handleDisconnect = useCallback(() => dispatch(setSocketConnected(false)), [dispatch]);

  useEffect(() => {
    setupSocketConnection();
    return () => cleanupSocket();
  }, []);

  const setupSocketConnection = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;
      socketService.connect(userId);
      socketService.on("new_post", handleNewPost);
      socketService.on("like_updated", handleLikeUpdate);
      socketService.on("connect", handleConnect);
      socketService.on("disconnect", handleDisconnect);
    } catch (e) { console.log("Socket setup error:", e); }
  };

  const cleanupSocket = () => {
    socketService.off("new_post", handleNewPost);
    socketService.off("like_updated", handleLikeUpdate);
    socketService.off("connect", handleConnect);
    socketService.off("disconnect", handleDisconnect);
    socketService.disconnect();
  };

  useEffect(() => { dispatch(fetchPosts()); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchPosts());
    await fetchUnreadCount();
    setRefreshing(false);
  }, [dispatch, fetchUnreadCount]);

  const renderItem = useCallback(
    ({ item, index }: { item: Post; index: number }) => (
      <View style={[styles.postWrap, index === 0 && { marginTop: 6 }]}>
        <PostCard post={item} />
      </View>
    ),
    []
  );

  const keyExtractor = useCallback((item: Post) => item._id, []);

  // Header shrink
  const titleScale = scrollY.interpolate({ inputRange: [0, 60], outputRange: [1, 0.9], extrapolate: "clamp" });
  const titleTranslate = scrollY.interpolate({ inputRange: [0, 60], outputRange: [0, -3], extrapolate: "clamp" });
  const headerBg = scrollY.interpolate({ inputRange: [0, 50], outputRange: ["#F5F5FB", "#FFFFFF"], extrapolate: "clamp" });
  const headerBorder = scrollY.interpolate({ inputRange: [0, 50], outputRange: [0, 1], extrapolate: "clamp" });

  const Header = () => (
    <View style={styles.headerOuter}>
      {/* Compose row */}
      <TouchableOpacity
        style={styles.composeBar}
        onPress={() => router.push("/add_post")}
        activeOpacity={0.85}
      >
        <View style={styles.composeAvatar}>
          <Ionicons name="person-outline" size={16} color="#6C63FF" />
        </View>
        <Text style={styles.composePlaceholder}>What's on your mind? (anonymous)</Text>
        <View style={styles.composeFab}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

    </View>
  );

  const Empty = () => {
    if (loading) return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading your feed…</Text>
      </View>
    );
    return (
      <View style={styles.center}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="newspaper-outline" size={36} color="#6C63FF" />
        </View>
        <Text style={styles.emptyTitle}>Nothing here yet</Text>
        <Text style={styles.emptySub}>Be the first to share something anonymous</Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/add_post")} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
          <Text style={styles.emptyBtnText}>Create Post</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const Footer = () => {
    if (!posts.length) return null;
    return (
      <View style={styles.footer}>
        <View style={styles.footerLine} />
        <Text style={styles.footerText}>You're all caught up</Text>
        <View style={styles.footerLine} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5FB" />

      {/* Sticky top bar */}
      <Animated.View style={[styles.stickyBar, { backgroundColor: headerBg, borderBottomWidth: headerBorder, borderBottomColor: "#EBEBF5" }]}>
        <Animated.View style={{ transform: [{ scale: titleScale }, { translateY: titleTranslate }] }}>
          <Text style={styles.appTitle}>
            Wh<Text style={styles.appTitleAccent}>i</Text>spr
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, isConnected && styles.statusDotLive]} />
            <Text style={styles.statusText}>{isConnected ? "Live" : "Connecting"}</Text>
          </View>
        </Animated.View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/notifications")}
            activeOpacity={0.75}
          >
            <Ionicons name="heart-outline" size={21} color="#6C63FF" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/chatlist")}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name="chat-processing-outline" size={22} color="#6C63FF" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.FlatList
        ref={flatListRef}
        data={posts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={Header}
        ListEmptyComponent={Empty}
        ListFooterComponent={Footer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6C63FF"
            colors={["#6C63FF"]}
            progressBackgroundColor="#FFFFFF"
          />
        }
        removeClippedSubviews={Platform.OS !== "ios"}
        maxToRenderPerBatch={MAX_TO_RENDER_PER_BATCH}
        windowSize={WINDOW_SIZE}
        initialNumToRender={INITIAL_NUM_TO_RENDER}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F5FB" },

  // Sticky bar
  stickyBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#F5F5FB",
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -1,
    marginBottom: 2,
  },
  appTitleAccent: { color: "#6C63FF" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },
  statusDotLive: {
    backgroundColor: "#10B981",
  },
  statusText: { fontSize: 11, color: "#9CA3AF", fontWeight: "600", letterSpacing: 0.3 },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#EBEBF5",
    position: "relative",
  },
  badge: {
    position: "absolute", top: -4, right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 9, minWidth: 17, height: 17,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 2, borderColor: "#F5F5FB",
  },
  badgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" },

  // Header inner sections
  headerOuter: { paddingTop: 8 },

  composeBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EBEBF5",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  composeAvatar: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  composePlaceholder: { flex: 1, fontSize: 14, color: "#C4C4D4", fontWeight: "500" },
  composeFab: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: "#6C63FF",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },

  sectionRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 20, marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 10, fontWeight: "700", color: "#C4C4D4", letterSpacing: 1,
  },
  liveDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: "#D1D5DB", marginLeft: 4,
  },
  liveDotActive: { backgroundColor: "#10B981" },
  liveText: { fontSize: 11, color: "#9CA3AF", fontWeight: "600" },

  topicRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  topicPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#FFFFFF",
    borderWidth: 1, borderColor: "#EBEBF5",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  topicPillActive: {
    backgroundColor: "#6C63FF", borderColor: "#6C63FF",
  },
  topicText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  topicTextActive: { color: "#FFFFFF" },

  dividerRow: { paddingHorizontal: 16, marginTop: 16, marginBottom: 6 },
  thinDivider: { height: 1, backgroundColor: "#F0F0F8" },
  feedLabel: {
    fontSize: 10, fontWeight: "700", color: "#C4C4D4",
    letterSpacing: 1, paddingHorizontal: 20, marginBottom: 4,
  },

  // List
  listContent: { paddingHorizontal: 14, paddingBottom: 100, flexGrow: 1 },
  postWrap: { marginBottom: 10 },

  // Empty
  center: { alignItems: "center", justifyContent: "center", paddingTop: 72, paddingHorizontal: 32, flex: 1 },
  emptyIconWrap: {
    width: 76, height: 76, borderRadius: 22,
    backgroundColor: "#EEF2FF",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 6 },
  emptySub: { fontSize: 14, color: "#9CA3AF", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: "#6C63FF", paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 14,
  },
  emptyBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  loadingText: { marginTop: 14, color: "#9CA3AF", fontSize: 14, fontWeight: "500" },

  // Footer
  footer: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 28, paddingHorizontal: 24 },
  footerLine: { flex: 1, height: 1, backgroundColor: "#EBEBF5" },
  footerText: { fontSize: 11, color: "#C4C4D4", fontWeight: "600", letterSpacing: 0.5 },
});