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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "../../src/redux/hooks";
import { 
  fetchPosts, 
  addNewPostRealtime, 
  updateLikeRealtime,
  setSocketConnected,
  Post
} from "../../src/redux/postsSlice";
import PostCard from "../../components/PostCard";
import socketService from "../../services/socket";

// Try to import AsyncStorage, but provide fallback
let AsyncStorage: any;
try {
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch (error) {
  console.log("AsyncStorage not available, using memory fallback");
  // Simple in-memory fallback
  AsyncStorage = {
    getItem: async (key: string) => null,
    setItem: async (key: string, value: string) => {},
  };
}

// Constants
const INITIAL_NUM_TO_RENDER = 8;
const MAX_TO_RENDER_PER_BATCH = 10;
const WINDOW_SIZE = 10;

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const { posts, loading, isConnected } = useAppSelector((state) => state.posts);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Get or create anonymous user ID
  const getUserId = useCallback(async () => {
    try {
      let userId = await AsyncStorage.getItem('anonymousUserId');
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('anonymousUserId', userId);
      }
      return userId;
    } catch (error) {
      console.log('Error getting userId:', error);
      return `user_${Date.now()}`;
    }
  }, []);

  // Handle new post from socket
  const handleNewPost = useCallback((newPost: Post) => {
    console.log('📱 New post received:', newPost);
    dispatch(addNewPostRealtime(newPost));
  }, [dispatch]);

  // Handle like update from socket
  const handleLikeUpdate = useCallback((data: { postId: string; likes: number }) => {
    console.log('❤️ Like update received:', data);
    dispatch(updateLikeRealtime(data));
  }, [dispatch]);

  // Handle socket connection
  const handleConnect = useCallback(() => {
    dispatch(setSocketConnected(true));
  }, [dispatch]);

  // Handle socket disconnection
  const handleDisconnect = useCallback(() => {
    dispatch(setSocketConnected(false));
  }, [dispatch]);

  // Setup socket connection and listeners
  useEffect(() => {
    setupSocketConnection();
    
    return () => {
      cleanupSocket();
    };
  }, []);

  const setupSocketConnection = async () => {
    try {
      const userId = await getUserId();
      socketService.connect(userId);

      // Register event listeners
      socketService.on('new_post', handleNewPost);
      socketService.on('like_updated', handleLikeUpdate);
      socketService.on('connect', handleConnect);
      socketService.on('disconnect', handleDisconnect);
    } catch (error) {
      console.log('Error setting up socket:', error);
    }
  };

  const cleanupSocket = () => {
    socketService.off('new_post', handleNewPost);
    socketService.off('like_updated', handleLikeUpdate);
    socketService.off('connect', handleConnect);
    socketService.off('disconnect', handleDisconnect);
    socketService.disconnect();
  };

  // Load initial posts
  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      await dispatch(fetchPosts());
    } catch (error) {
      console.log('Error loading posts:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchPosts());
    setRefreshing(false);
  }, [dispatch]);

  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Post; index: number }) => (
      <View style={[styles.postContainer, index === 0 && styles.firstPost]}>
        <PostCard post={item} />
      </View>
    ),
    []
  );

  const ListHeaderComponent = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>Anonymous Feed</Text>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, isConnected && styles.statusDotActive]} />
          <Text style={styles.statusText}>
            {isConnected ? '● Live' : '○ Connecting...'} • {posts.length} {posts.length === 1 ? 'post' : 'posts'}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity 
        onPress={scrollToTop}
        style={styles.globeBadge}
        activeOpacity={0.7}
      >
        <Ionicons name="globe-outline" size={22} color="#6C63FF" />
      </TouchableOpacity>
    </View>
  );

  const ListEmptyComponent = () => {
    if (loading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loadingText}>Loading your feed...</Text>
        </View>
      );
    }

    return (
      <View style={styles.centerBox}>
        <Ionicons name="newspaper-outline" size={64} color="#C4C4D4" />
        <Text style={styles.emptyTitle}>No posts yet</Text>
        <Text style={styles.emptySub}>
          Be the first to share something anonymous
        </Text>
      </View>
    );
  };

  const ListFooterComponent = () => {
    if (!posts.length) return null;
    
    return (
      <View style={styles.footer}>
        <Ionicons name="checkmark-circle-outline" size={16} color="#BBBBCC" />
        <Text style={styles.footerText}>You're all caught up ✨</Text>
      </View>
    );
  };

  const keyExtractor = useCallback((item: Post) => item._id, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5FA" />

      <FlatList
        ref={flatListRef}
        data={posts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6C63FF"
            colors={["#6C63FF"]}
            progressBackgroundColor="#FFFFFF"
          />
        }
        removeClippedSubviews={Platform.OS === 'ios' ? false : true}
        maxToRenderPerBatch={MAX_TO_RENDER_PER_BATCH}
        windowSize={WINDOW_SIZE}
        initialNumToRender={INITIAL_NUM_TO_RENDER}
        onEndReachedThreshold={0.5}
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
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#F5F5FA",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EAEAF0",
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A2E",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C4C4D4",
  },
  statusDotActive: {
    backgroundColor: "#4CAF50",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 2,
  },
  statusText: {
    fontSize: 12,
    color: "#9999AA",
    fontWeight: "500",
  },
  globeBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EAEAF0",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 80,
    flexGrow: 1,
  },
  postContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  firstPost: {
    marginTop: 8,
  },
  centerBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    paddingHorizontal: 32,
    flex: 1,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A2E",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: "#9999AA",
    textAlign: "center",
    lineHeight: 20,
  },
  loadingText: {
    marginTop: 16,
    color: "#9999AA",
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 13,
    color: "#BBBBCC",
    fontWeight: "500",
  },
});