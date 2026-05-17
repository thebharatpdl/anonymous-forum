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
import { getUserId } from "../../services/authService";

const INITIAL_NUM_TO_RENDER = 8;
const MAX_TO_RENDER_PER_BATCH = 10;
const WINDOW_SIZE = 10;

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { posts, loading, isConnected } = useAppSelector((state) => state.posts);
  const [refreshing, setRefreshing] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Keyboard
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setIsKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setIsKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const getCurrentUserId = useCallback(async () => {
    return (await getUserId()) || "";
  }, []);

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
    } catch (e) {
      console.log("Socket setup error:", e);
    }
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
    setRefreshing(false);
  }, [dispatch]);

  const renderItem = useCallback(
    ({ item, index }: { item: Post; index: number }) => (
      <View style={[styles.postWrap, index === 0 && { marginTop: 4 }]}>
        <PostCard post={item} />
      </View>
    ),
    []
  );

  const keyExtractor = useCallback((item: Post) => item._id, []);

  // Header shrink on scroll
  const titleScale = scrollY.interpolate({
    inputRange: [0, 60], outputRange: [1, 0.88], extrapolate: "clamp",
  });
  const titleTranslate = scrollY.interpolate({
    inputRange: [0, 60], outputRange: [0, -4], extrapolate: "clamp",
  });

  const Header = () => (
    <View style={styles.header}>
      <Animated.View style={{ transform: [{ scale: titleScale }, { translateY: titleTranslate }] }}>
        <Text style={styles.headerTitle}>EchoVoice</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, isConnected && styles.statusDotLive]} />
          <Text style={styles.statusText}>
            {isConnected ? "Live" : "Connecting"}
          </Text>
          <Text style={styles.statusSep}>·</Text>
          <Text style={styles.statusText}>
            {posts.length} {posts.length === 1 ? "post" : "posts"}
          </Text>
        </View>
      </Animated.View>

      <View style={styles.headerIcons}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push("/notifications")}
          activeOpacity={0.75}
        >
          <Ionicons name="heart-outline" size={22} color="#6C63FF" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push("/chatlist")}
          activeOpacity={0.75}
        >
          <MaterialCommunityIcons name="chat-processing-outline" size={23} color="#6C63FF" />
        </TouchableOpacity>
      </View>
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
          <Ionicons name="newspaper-outline" size={40} color="#6C63FF" />
        </View>
        <Text style={styles.emptyTitle}>Nothing here yet</Text>
        <Text style={styles.emptySub}>Be the first to share something anonymous</Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/add_post")}>
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
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7FC" />
      <Header />
      <Animated.FlatList
        ref={flatListRef}
        data={posts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListEmptyComponent={Empty}
        ListFooterComponent={Footer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
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
  safe: { flex: 1, backgroundColor: "#F7F7FC" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: "#F7F7FC",
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBF5",
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#6C63FF",
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: "#D1D5DB",
  },
  statusDotLive: {
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
  statusText: { fontSize: 12, color: "#9CA3AF", fontWeight: "500" },
  statusSep: { fontSize: 12, color: "#D1D5DB" },

  headerIcons: { flexDirection: "row", gap: 10 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#EBEBF5",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    position: "relative",
  },
  badge: {
    position: "absolute", top: -3, right: -3,
    backgroundColor: "#F43F5E",
    borderRadius: 9, minWidth: 18, height: 18,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2, borderColor: "#F7F7FC",
  },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },

  // List
  listContent: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 90, flexGrow: 1 },
  postWrap: { marginBottom: 12 },

  // Empty
  center: { alignItems: "center", justifyContent: "center", paddingTop: 80, paddingHorizontal: 32, flex: 1 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: "#EEF2FF",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 19, fontWeight: "700", color: "#111827", marginBottom: 6 },
  emptySub: { fontSize: 14, color: "#9CA3AF", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  emptyBtn: {
    backgroundColor: "#6C63FF", paddingHorizontal: 28,
    paddingVertical: 13, borderRadius: 22,
  },
  emptyBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  loadingText: { marginTop: 14, color: "#9CA3AF", fontSize: 14, fontWeight: "500" },

  // Footer
  footer: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 28, paddingHorizontal: 24 },
  footerLine: { flex: 1, height: 1, backgroundColor: "#EBEBF5" },
  footerText: { fontSize: 12, color: "#C4C4D4", fontWeight: "600" },
});