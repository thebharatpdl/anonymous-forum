import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
  Alert,
  StatusBar,
  Animated,
  Keyboard,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "../src/redux/hooks";
import {
  commentPostAsync,
  likePostAsync,
  savePostAsync,
  deletePostAsync,
  Post,
} from "../src/redux/postsSlice";
import { getCurrentUser } from "../services/authService";

type Comment = { content: string; username: string; createdAt?: string };

// Height of the input bar row (paddingTop 10 + paddingBottom 10 + input minHeight 44 = 64)
const INPUT_BAR_HEIGHT = 64;

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

  // Keyboard state
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const likeScale = useRef(new Animated.Value(1)).current;
  const saveScale = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // ─── KEYBOARD TRACKING ───────────────────────────────────────
  // On Android we manually track the keyboard height.
  //
  // REQUIRED in app.json (Expo managed) to prevent the OS from
  // resizing the window and double-shifting the layout:
  //
  //   "android": {
  //     "softwareKeyboardLayoutMode": "pan"
  //   }
  //
  // With "pan" the window stays full-height and the keyboard
  // overlays it — our manual `bottom: keyboardHeight` on the
  // input bar and `paddingBottom` on the FlatList do all the work.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      const h = e.endCoordinates.height;
      setKeyboardHeight(h);
      setKeyboardVisible(true);
      // Wait one frame for the state update to apply to the layout,
      // then scroll so the input field is visible above the keyboard.
      requestAnimationFrame(() => {
        if (localComments.length > 0) {
          const scrollOffset = localComments.length - 1;
          flatListRef.current?.scrollToIndex({
            index: scrollOffset,
            viewPosition: 0.8,
            animated: true,
          });
        } else {
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      });
    });

    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
      setKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [localComments.length]);

  const isSaved = useAppSelector((state) => {
    const p = state.posts.posts.find((p: Post) => p._id === post?._id);
    return p?.isSaved || false;
  });

  useEffect(() => {
    const checkOwnership = async () => {
      const user = await getCurrentUser();
      if (user && post) {
        setIsOwner(post.authorId === user.id);
      }
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
      <View style={styles.safe}>
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
    Alert.alert("Delete Post", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
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

  const renderComment = ({ item }: { item: Comment }) => {
    const color = getAvatarColor(item.username || "A");
    return (
      <View style={styles.commentItem}>
        <View style={[styles.commentAvatar, { backgroundColor: color + "14" }]}>
          <Text style={[styles.commentAvatarText, { color }]}>
            {(item.username?.[0] ?? "?").toUpperCase()}
          </Text>
        </View>
        <View style={styles.commentBody}>
          <View style={styles.commentTop}>
            <Text style={[styles.commentUser, { color }]}>{item.username}</Text>
            <Text style={styles.commentTime}>
              {item.createdAt ? getRelativeTime(item.createdAt) : "Just now"}
            </Text>
          </View>
          <Text style={styles.commentText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────
  const safeBottom = Math.max(insets.bottom, 12);

  const listPaddingBottom = keyboardVisible
    ? keyboardHeight + INPUT_BAR_HEIGHT + 16
    : INPUT_BAR_HEIGHT + safeBottom + 16;

  const inputBarBottom = keyboardVisible ? keyboardHeight : 0;
  const inputBarPaddingBottom = keyboardVisible ? 6 : safeBottom;

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Top Bar ── */}
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1C1E21" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Post</Text>
        <TouchableOpacity style={styles.backBtn} onPress={handleSave}>
          <Animated.View style={{ transform: [{ scale: saveScale }] }}>
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={22}
              color={isSaved ? "#6C63FF" : "#1C1E21"}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* ── Feed ── */}
      <FlatList
        ref={flatListRef}
        data={localComments}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderComment}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: listPaddingBottom }}
        ListHeaderComponent={
          <View>
            {/* Post card */}
            <View style={styles.postCard}>
              <TouchableOpacity
                style={styles.postHeader}
                onPress={handleUsernamePress}
                activeOpacity={0.75}
              >
                <View style={[styles.avatar, { backgroundColor: avatarColor + "14", borderColor: avatarColor + "35" }]}>
                  <Text style={[styles.avatarText, { color: avatarColor }]}>{avatarLetter}</Text>
                </View>
                <View style={styles.headerMeta}>
                  <Text style={[styles.postUsername, { color: avatarColor }]}>{post.username}</Text>
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

              <Text style={styles.postContent}>{post.content}</Text>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionChip, liked && styles.actionChipLiked]}
                  onPress={handleLike}
                  disabled={isLiking}
                  activeOpacity={0.75}
                >
                  <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                    <Ionicons
                      name={liked ? "heart" : "heart-outline"}
                      size={20}
                      color={liked ? "#F43F5E" : "#9CA3AF"}
                    />
                  </Animated.View>
                  <Text style={[styles.actionChipText, liked && styles.actionChipTextLiked]}>
                    {localLikes > 0 ? localLikes : "Like"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionChip}
                  onPress={() => inputRef.current?.focus()}
                  activeOpacity={0.75}
                >
                  <Ionicons name="chatbubble-outline" size={19} color="#9CA3AF" />
                  <Text style={styles.actionChipText}>
                    {localComments.length > 0 ? localComments.length : "Comment"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {localComments.length > 0 && (
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsLabel}>
                  Comments ({localComments.length})
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyComments}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="chatbubbles-outline" size={34} color="#6C63FF" />
            </View>
            <Text style={styles.emptyCommentsTitle}>No comments yet</Text>
            <Text style={styles.emptyCommentsSub}>Be the first to reply</Text>
            <TouchableOpacity
              style={styles.replyBtn}
              onPress={() => inputRef.current?.focus()}
              activeOpacity={0.8}
            >
              <Text style={styles.replyBtnText}>Write a reply</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* ── Input bar ──────────────────────────────────────────────
           Always position:absolute.
           `bottom` slides it up with the keyboard.
           `paddingBottom` handles safe area when keyboard is closed.
      ─────────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.inputContainer,
          {
            bottom: inputBarBottom,
            paddingBottom: inputBarPaddingBottom,
          },
        ]}
      >
        <View style={styles.inputBar}>
          <View style={[styles.inputAvatar, { backgroundColor: "#6C63FF14", borderColor: "#6C63FF35" }]}>
            <Ionicons name="person-outline" size={15} color="#6C63FF" />
          </View>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Add a comment…"
            placeholderTextColor="#C4C4D4"
            value={commentContent}
            onChangeText={setCommentContent}
            onFocus={() => {
              // When input is focused, scroll to ensure it's well above the keyboard
              if (localComments.length > 0) {
                setTimeout(() => {
                  const scrollOffset = localComments.length - 1;
                  flatListRef.current?.scrollToIndex({
                    index: scrollOffset,
                    viewPosition: 0.8,
                    animated: true,
                  });
                }, 150);
              }
            }}
            multiline
            maxLength={500}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleComment}
            // textAlignVertical top ensures cursor starts at top of the box
            // on Android so text is always visible from the first character.
            textAlignVertical="top"
            scrollEnabled
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              (!commentContent.trim() || isCommenting) && styles.sendBtnDisabled,
              pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
            ]}
            onPress={handleComment}
            disabled={!commentContent.trim() || isCommenting}
          >
            <Ionicons name="send" size={15} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F5FB",
  },

  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F8",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F5F5FB",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1E21",
  },

  postCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F0F0F8",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  avatarText: { fontSize: 17, fontWeight: "700" },
  headerMeta: { flex: 1 },
  postUsername: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  metaRow: { flexDirection: "row", alignItems: "center" },
  postTime: { fontSize: 11, color: "#C4C4D4", fontWeight: "500" },
  editedTag: { fontSize: 11, color: "#C4C4D4", fontStyle: "italic" },
  deleteBtn: { padding: 6 },

  postContent: {
    fontSize: 15,
    color: "#1F2937",
    lineHeight: 23,
    marginBottom: 14,
    letterSpacing: 0.1,
  },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F5F5FA",
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F0F0F8",
  },
  actionChipLiked: {
    backgroundColor: "#FFF5F5",
    borderColor: "#FECDD3",
  },
  actionChipText: { fontSize: 13, fontWeight: "600", color: "#9CA3AF" },
  actionChipTextLiked: { color: "#F43F5E" },

  commentsHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },
  commentsLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: 0.2,
  },

  commentItem: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  commentAvatarText: { fontSize: 13, fontWeight: "700" },
  commentBody: { flex: 1 },
  commentTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  commentUser: { fontSize: 13, fontWeight: "700" },
  commentTime: { fontSize: 11, color: "#D1D5DB" },
  commentText: { fontSize: 14, color: "#374151", lineHeight: 20 },

  emptyComments: {
    alignItems: "center",
    paddingVertical: 56,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyCommentsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  emptyCommentsSub: {
    fontSize: 13,
    color: "#C4C4D4",
    textAlign: "center",
  },
  replyBtn: {
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  replyBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6C63FF",
  },

  // Input container — always absolute, bottom driven by keyboard state
  inputContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F8",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  inputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 14,
    color: "#111827",
 
    minHeight: 44,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: "#F0F0F8",
    textAlignVertical: "top",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#6C63FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginBottom: 2,
  },
  sendBtnDisabled: { backgroundColor: "#E5E7EB" },
});