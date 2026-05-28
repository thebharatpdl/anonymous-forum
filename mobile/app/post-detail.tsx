import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Platform, Alert, StatusBar, Animated,
  KeyboardAvoidingView, Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "../src/redux/hooks";
import {
  commentPostAsync, likePostAsync, savePostAsync,
  deletePostAsync, Post,
} from "../src/redux/postsSlice";
import { getCurrentUser } from "../services/authService";

type Comment = { content: string; username: string; createdAt?: string };

const AVATAR_COLORS = [
  "#6C63FF", "#F43F5E", "#10B981", "#F59E0B",
  "#3B82F6", "#EC4899", "#14B8A6", "#8B5CF6",
];

function getAvatarColor(name: string) {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function getRelativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (s < 60) return "Just now";
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

export default function PostDetail() {
  const { post: postParam } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();

  const post: Post = postParam ? JSON.parse(postParam as string) : null;

  const [localComments, setLocalComments] = useState<Comment[]>(post?.comments || []);
  const [commentContent, setCommentContent] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [localLikes, setLocalLikes] = useState(post?.likes || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [liked, setLiked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const likeScale = useRef(new Animated.Value(1)).current;
  const saveScale = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef<FlatList>(null);

  const isSaved = useAppSelector((state) => {
    const p = state.posts.posts.find((p: Post) => p._id === post?._id);
    return p?.isSaved || false;
  });

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardOpen(true);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardOpen(false);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    const checkOwnership = async () => {
      const user = await getCurrentUser();
      if (user && post) setIsOwner(post.authorId === user.id);
    };
    if (post) checkOwnership();
  }, [post?._id]);

  const animateBounce = (anim: Animated.Value) => {
    Animated.sequence([
      Animated.spring(anim, { toValue: 1.3, tension: 200, friction: 5, useNativeDriver: true }),
      Animated.spring(anim, { toValue: 1, tension: 200, friction: 5, useNativeDriver: true }),
    ]).start();
  };

  if (!post) {
    return (
      <View style={styles.container}>
        <View style={[styles.topBar, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1C1E21" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Post</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#C4C4D4" />
          <Text style={styles.errorText}>Post not found</Text>
        </View>
      </View>
    );
  }

  const avatarColor = getAvatarColor(post.username || "A");
  const avatarLetter = (post.username || "A")[0].toUpperCase();

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLocalLikes((prev) => (wasLiked ? prev - 1 : prev + 1));
    animateBounce(likeScale);
    try {
      const result = await dispatch(likePostAsync(post._id)).unwrap();
      setLocalLikes(result.likes);
    } catch {
      setLiked(wasLiked);
      setLocalLikes((prev) => (wasLiked ? prev + 1 : prev - 1));
      Alert.alert("Error", "Failed to like post");
    } finally {
      setIsLiking(false);
    }
  };

  const handleSave = async () => {
    animateBounce(saveScale);
    try {
      await dispatch(savePostAsync(post._id)).unwrap();
    } catch {
      Alert.alert("Error", "Failed to save post");
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Post", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await dispatch(deletePostAsync(post._id)).unwrap();
            router.back();
          } catch {
            Alert.alert("Error", "Failed to delete");
          }
        },
      },
    ]);
  };

  const handleComment = async () => {
    if (!commentContent.trim() || isCommenting) return;
    setIsCommenting(true);
    try {
      const result = await dispatch(
        commentPostAsync({ postId: post._id, content: commentContent.trim() })
      ).unwrap();
      setLocalComments((prev) => [result.comment, ...prev]);
      setCommentContent("");
      Keyboard.dismiss();
    } catch {
      Alert.alert("Error", "Failed to add comment");
    } finally {
      setIsCommenting(false);
    }
  };

  const handleUsernamePress = () => {
    if (isOwner) router.push("/(tabs)/profile");
    else if (post.authorId) router.push(`/${post.authorId}`);
  };

  const handleStartChat = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) { Alert.alert("Error", "Please login first"); return; }
      const otherUserId = post.authorId;
      if (!otherUserId) { Alert.alert("Error", "Author ID missing"); return; }
      const roomId = [user.id, otherUserId].sort().join("-");
      router.push({ pathname: "/chat", params: { roomId, otherUserId, otherUserName: post.username } });
    } catch {
      Alert.alert("Error", "Could not start chat");
    }
  };

  const renderComment = ({ item }: { item: Comment }) => {
    const commentAvatarColor = getAvatarColor(item.username || "A");
    return (
      <View style={styles.commentItem}>
        <View style={[styles.commentAvatar, { backgroundColor: commentAvatarColor + "14" }]}>
          <Text style={[styles.commentAvatarText, { color: commentAvatarColor }]}>
            {(item.username?.[0] ?? "?").toUpperCase()}
          </Text>
        </View>
        <View style={styles.commentBody}>
          <View style={styles.commentTop}>
            <Text style={[styles.commentUser, { color: commentAvatarColor }]}>{item.username}</Text>
            <Text style={styles.commentTime}>
              {item.createdAt ? getRelativeTime(item.createdAt) : "Just now"}
            </Text>
          </View>
          <Text style={styles.commentText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1C1E21" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Post</Text>
        {/* <TouchableOpacity style={styles.backBtn} onPress={handleSave}>
          <Animated.View style={{ transform: [{ scale: saveScale }] }}>
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={22}
              color={isSaved ? "#6C63FF" : "#1C1E21"}
            />
          </Animated.View>
        </TouchableOpacity> */}
      </View>

      {/* Content */}
    <KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  keyboardVerticalOffset={-40}
>
        <FlatList
          ref={flatListRef}
          data={localComments}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderComment}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
          ListHeaderComponent={
            <View>
              {/* Post Card */}
              <View style={styles.postCard}>
                {/* Header */}
                <TouchableOpacity
                  style={styles.postHeader}
                  onPress={handleUsernamePress}
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatar, { backgroundColor: avatarColor + "14", borderColor: avatarColor + "35" }]}>
                    <Text style={[styles.avatarText, { color: avatarColor }]}>{avatarLetter}</Text>
                  </View>
                  <View style={styles.headerMeta}>
                    <Text style={styles.postUsername}>{post.username}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.postTime}>
                        {post.createdAt ? getRelativeTime(post.createdAt) : "Just now"}
                      </Text>
                      {post.edited && <Text style={styles.editedTag}> · Edited</Text>}
                    </View>
                  </View>
                  {isOwner && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={handleDelete}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {/* Content */}
                <Text style={styles.postContent}>{post.content}</Text>

                {/* Actions */}
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={[styles.actionBtn, liked && styles.actionBtnLiked]}
                    onPress={handleLike}
                    disabled={isLiking}
                    activeOpacity={0.7}
                  >
                    <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                      <Ionicons
                        name={liked ? "heart" : "heart-outline"}
                        size={22}
                        color={liked ? "#F43F5E" : "#9CA3AF"}
                      />
                    </Animated.View>
                    <Text style={[styles.actionBtnText, liked && styles.actionBtnTextLiked]}>
                      {localLikes > 0 ? localLikes : "Like"}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.actionBtn}>
                    <Ionicons name="chatbubble-outline" size={20} color="#9CA3AF" />
                    <Text style={styles.actionBtnText}>
                      {localComments.length > 0 ? localComments.length : "Comment"}
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.actionBtn} onPress={handleStartChat} activeOpacity={0.7}>
                    <Ionicons name="send-outline" size={18} color="#9CA3AF" />
                    <Text style={styles.actionBtnText}>Message</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Comments Section Header */}
              {localComments.length > 0 && (
                <View style={styles.commentsSectionHeader}>
                  <Text style={styles.commentsLabel}>
                    Comments ({localComments.length})
                  </Text>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyComments}>
              <Ionicons name="chatbubbles-outline" size={48} color="#E5E7EB" />
              <Text style={styles.emptyCommentsTitle}>No comments yet</Text>
              <Text style={styles.emptyCommentsSub}>Be the first to reply</Text>
            </View>
          }
        />

        {/* Comment Input Bar */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <View style={styles.inputAvatar}>
            <Ionicons name="person-outline" size={15} color="#6C63FF" />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Add a comment…"
            placeholderTextColor="#C4C4D4"
            value={commentContent}
            onChangeText={setCommentContent}
            multiline
            maxLength={500}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleComment}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!commentContent.trim() || isCommenting) && styles.sendBtnDisabled]}
            onPress={handleComment}
            disabled={!commentContent.trim() || isCommenting}
            activeOpacity={0.85}
          >
            <Ionicons name="send" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5FB" },

  errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, color: "#9CA3AF", fontWeight: "500" },

  // Top Bar
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#FFFFFF", paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#F0F0F8",
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "#F5F5FB", alignItems: "center", justifyContent: "center",
  },
topBarTitle: { 
  fontSize: 17, 
  fontWeight: "700", 
  color: "#1C1E21",
  textAlign: "center",
  flex: 1,           // ✅ Takes available space, centers itself
},
  // Post Card
  postCard: {
    backgroundColor: "#FFFFFF", marginHorizontal: 14, marginTop: 12,
    borderRadius: 20, padding: 14, borderWidth: 1, borderColor: "#F0F0F8",
  },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  avatar: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5,
  },
  avatarText: { fontSize: 18, fontWeight: "700" },
  headerMeta: { flex: 1 },
  postUsername: { fontSize: 15, fontWeight: "700", color: "#1F2937", marginBottom: 2 },
  metaRow: { flexDirection: "row", alignItems: "center" },
  postTime: { fontSize: 12, color: "#C4C4D4", fontWeight: "500" },
  editedTag: { fontSize: 12, color: "#C4C4D4", fontStyle: "italic" },
  deleteBtn: { padding: 6 },
  postContent: {
    fontSize: 15, color: "#1F2937", lineHeight: 22,
    marginBottom: 14, letterSpacing: 0.1,
  },

  // Actions
  actionsContainer: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-around",
    paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F0F0F8",
  },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20,
  },
  actionBtnLiked: { backgroundColor: "#FFF5F5" },
  actionBtnText: { fontSize: 13, fontWeight: "600", color: "#9CA3AF" },
  actionBtnTextLiked: { color: "#F43F5E" },

  // Comments Section
  commentsSectionHeader: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 8 },
  commentsLabel: { fontSize: 14, fontWeight: "700", color: "#1F2937" },

  // Comment Items
  commentItem: {
    flexDirection: "row", gap: 10, paddingHorizontal: 16,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F9FAFB",
  },
  commentAvatar: {
    width: 34, height: 34, borderRadius: 11,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  commentAvatarText: { fontSize: 13, fontWeight: "700" },
  commentBody: { flex: 1 },
  commentTop: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 3,
  },
  commentUser: { fontSize: 13, fontWeight: "700" },
  commentTime: { fontSize: 11, color: "#D1D5DB" },
  commentText: { fontSize: 14, color: "#374151", lineHeight: 20 },

  // Empty Comments
  emptyComments: { alignItems: "center", paddingVertical: 60, gap: 10, paddingHorizontal: 30 },
  emptyCommentsTitle: { fontSize: 17, fontWeight: "600", color: "#9CA3AF" },
  emptyCommentsSub: { fontSize: 13, color: "#D1D5DB", textAlign: "center" },

  // Input Bar
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: "#F3F4F6", backgroundColor: "#FFFFFF",
  },
  inputAvatar: {
    width: 34, height: 34, borderRadius: 12,
    backgroundColor: "#6C63FF14", borderWidth: 1.5, borderColor: "#6C63FF35",
    alignItems: "center", justifyContent: "center",
  },
  input: {
    flex: 1, backgroundColor: "#F9FAFB", borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: "#111827", maxHeight: 80,
    borderWidth: 1, borderColor: "#F0F0F8",
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#6C63FF", alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#E5E7EB" },
});