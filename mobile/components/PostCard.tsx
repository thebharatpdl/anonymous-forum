import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  FlatList,
  Pressable,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "../src/redux/hooks";
import {
  likePostAsync,
  commentPostAsync,
  deletePostAsync,
  savePostAsync,
  hidePostAsync,
  reportPostAsync,
  editPostAsync,
  Post,
} from "../src/redux/postsSlice";
import { getCurrentUser } from "../services/authService";
import axios from "axios";
import { API_URL } from "../src/config";
import PostMenu from "./PostMenu";
import EditPostModal from "./EditPostModal";

type PostCardProps = { post: Post };
type Comment = { content: string; username: string; createdAt?: string };

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

const AVATAR_COLORS = [
  "#6C63FF", "#F43F5E", "#10B981", "#F59E0B",
  "#3B82F6", "#EC4899", "#14B8A6", "#8B5CF6",
];
function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export default function PostCard({ post }: PostCardProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [localComments, setLocalComments] = useState<Comment[]>(post.comments || []);
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(post.likes || 0);
  const [isOwner, setIsOwner] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const likeScale = useRef(new Animated.Value(1)).current;
  const saveScale = useRef(new Animated.Value(1)).current;

  const avatarColor = getAvatarColor(post.username || "A");
  const avatarLetter = (post.username || "A")[0].toUpperCase();

  const isSaved = useAppSelector((state) => {
    const p = state.posts.posts.find((p: Post) => p._id === post._id);
    return p?.isSaved || false;
  });

  useEffect(() => {
    const checkOwnership = async () => {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUserId(user.id);
        setIsOwner(post.authorId === user.id);
      }
    };
    checkOwnership();
  }, [post.authorId]);

  const animateBounce = (anim: Animated.Value) => {
    Animated.sequence([
      Animated.spring(anim, { toValue: 1.3, tension: 200, friction: 5, useNativeDriver: true }),
      Animated.spring(anim, { toValue: 1, tension: 200, friction: 5, useNativeDriver: true }),
    ]).start();
  };

  const handleUsernamePress = () => {
    if (isOwner) router.push("/(tabs)/profile");
    else router.push(`/${post.authorId}`);
  };

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

  const handleReport = () => setShowReportModal(true);

  const submitReport = async () => {
    if (!reportReason) { Alert.alert("Error", "Please select a reason"); return; }
    try {
      await dispatch(reportPostAsync({ postId: post._id, reason: reportReason })).unwrap();
      Alert.alert("Reported", "Thank you for helping keep our community safe");
      setShowReportModal(false);
      setReportReason("");
    } catch {
      Alert.alert("Error", "Failed to report post");
    }
  };

  const handleEdit = () => setEditModalVisible(true);
  const handleSaveEdit = async (postId: string, content: string) => {
    await dispatch(editPostAsync({ postId, content })).unwrap();
  };

  const handleDelete = () => {
    Alert.alert("Delete Post", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await dispatch(deletePostAsync(post._id)).unwrap();
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
      setLocalComments([result.comment, ...localComments]);
      setCommentContent("");
    } catch {
      Alert.alert("Error", "Failed to add comment");
    } finally {
      setIsCommenting(false);
    }
  };

  const handleRepost = async () => {
    if (isReposting) return;
    setIsReposting(true);
    try {
      await axios.post(`${API_URL}/repost/${post._id}`, { username: "anon_user" });
      Alert.alert("Reposted!", "Post shared to your feed.");
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.error || "Failed to repost");
    } finally {
      setIsReposting(false);
    }
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

  const handleViewDetail = () => {
    router.push({ pathname: "/post-detail", params: { post: JSON.stringify(post) } });
  };

  return (
    <>
      <Pressable
        onPress={handleViewDetail}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: avatarColor + "14", borderColor: avatarColor + "35" }]}>
            <Text style={[styles.avatarText, { color: avatarColor }]}>{avatarLetter}</Text>
          </View>
          <TouchableOpacity style={styles.headerMeta} onPress={handleUsernamePress} activeOpacity={0.7}>
            <Text style={styles.username}>{post.username}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.time}>
                {post.createdAt ? getRelativeTime(post.createdAt) : "Just now"}
              </Text>
              {post.edited && <Text style={styles.editedTag}> · Edited</Text>}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => setMenuVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        <Text style={styles.content}>{post.content}</Text>

        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionBtn, liked && styles.actionBtnLiked]} 
            onPress={handleLike} 
            disabled={isLiking}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              <Ionicons
                name={liked ? "arrow-up-circle" : "arrow-up-circle-outline"}
                size={22}
                color={liked ? "#10B981" : "#9CA3AF"}
              />
            </Animated.View>
            <Text style={[styles.actionBtnText, liked && styles.actionBtnTextLiked]}>
              {localLikes > 0 ? localLikes : ""}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => setCommentModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#9CA3AF" />
            <Text style={styles.actionBtnText}>
              {localComments.length > 0 ? localComments.length : ""}
            </Text>
          </TouchableOpacity>
{!isOwner && (

          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={handleStartChat}
            activeOpacity={0.7}
          >
            <Feather name="send" size={18} color="#9CA3AF" />
          </TouchableOpacity>
          )}
        </View>
      </Pressable>

      <PostMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        isOwner={isOwner}
        isSaved={isSaved}
        onSave={handleSave}
        onDelete={handleDelete}
        onNotInterested={() => Alert.alert("Not Interested", "We'll show fewer posts like this")}
        onReport={handleReport}
        onEdit={handleEdit}
      />

      <EditPostModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        postId={post._id}
        initialContent={post.content}
        onSave={handleSaveEdit}
      />

      {/* ✅ FIXED Comment Modal */}
      <Modal 
        visible={commentModalVisible} 
        animationType="slide" 
        transparent
        statusBarTranslucent
        onRequestClose={() => {
          setCommentModalVisible(false);
          setCommentContent('');
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.commentSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Comments</Text>
              <TouchableOpacity 
                style={styles.closeBtn} 
                onPress={() => {
                  setCommentModalVisible(false);
                  setCommentContent('');
                }}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={localComments}
              keyExtractor={(_, i) => i.toString()}
              style={styles.commentListContainer}
              contentContainerStyle={styles.commentListContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <View style={[styles.commentAvatar, { backgroundColor: getAvatarColor(item.username) + "14" }]}>
                    <Text style={[styles.commentAvatarText, { color: getAvatarColor(item.username) }]}>
                      {item.username[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.commentBody}>
                    <View style={styles.commentTop}>
                      <Text style={styles.commentUser}>{item.username}</Text>
                      <Text style={styles.commentTime}>
                        {item.createdAt ? getRelativeTime(item.createdAt) : "Just now"}
                      </Text>
                    </View>
                    <Text style={styles.commentText}>{item.content}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyComments}>
                  <Ionicons name="chatbubbles-outline" size={40} color="#E5E7EB" />
                  <Text style={styles.emptyCommentsTitle}>No comments yet</Text>
                  <Text style={styles.emptyCommentsSub}>Be the first to reply</Text>
                </View>
              }
            />

            <View style={styles.inputRow}>
              <TextInput
                placeholder="Add a comment…"
                placeholderTextColor="#C4C4D4"
                value={commentContent}
                onChangeText={setCommentContent}
                style={styles.commentInput}
                multiline
                maxLength={500}
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={handleComment}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !commentContent.trim() && styles.sendBtnDisabled]}
                onPress={handleComment}
                disabled={isCommenting || !commentContent.trim()}
                activeOpacity={0.85}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Report Modal */}
      <Modal visible={showReportModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.reportSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Report Post</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.reportSubtitle}>Why are you reporting this?</Text>

            {["Spam or misleading", "Harassment or bullying", "Hate speech", "Inappropriate content", "Misinformation", "Other"].map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[styles.reportOption, reportReason === reason && styles.reportOptionActive]}
                onPress={() => setReportReason(reason)}
                activeOpacity={0.75}
              >
                <Text style={[styles.reportOptionText, reportReason === reason && styles.reportOptionTextActive]}>
                  {reason}
                </Text>
                {reportReason === reason && <Ionicons name="checkmark-circle" size={20} color="#6C63FF" />}
              </TouchableOpacity>
            ))}

            <View style={styles.reportBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowReportModal(false)} activeOpacity={0.75}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={submitReport} activeOpacity={0.85}>
                <Text style={styles.submitBtnText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F0F0F8",
  },
  cardPressed: { opacity: 0.97, transform: [{ scale: 0.995 }] },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  avatar: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5,
  },
  avatarText: { fontSize: 15, fontWeight: "700" },
  headerMeta: { flex: 1 },
  username: { 
    fontSize: 14, 
    fontWeight: "700", 
    color: "#1F2937",
    marginBottom: 2,
  },
  metaRow: { flexDirection: "row", alignItems: "center" },
  time: { fontSize: 11, color: "#C4C4D4", fontWeight: "500" },
  editedTag: { fontSize: 11, color: "#C4C4D4", fontStyle: "italic" },
  moreBtn: { padding: 4 },
  content: {
    fontSize: 15, 
    color: "#1F2937", 
    lineHeight: 22,
    marginBottom: 14, 
    letterSpacing: 0.1,
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F8",
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  actionBtnLiked: {
    backgroundColor: "#F0FDF4",
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  actionBtnTextLiked: {
    color: "#10B981",
  },
  
  // ✅ Modal Overlay
  modalOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.4)", 
    justifyContent: "flex-end" 
  },
  overlay: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.4)", 
    justifyContent: "flex-end" 
  },
  
  // ✅ Comment Sheet
  commentSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '95%',
    minHeight: '50%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  commentListContainer: {
    flex: 1,
  },
  
  reportSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    overflow: "hidden",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  commentListContent: { 
    paddingHorizontal: 16, 
    paddingBottom: 8 
  },
  commentItem: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 12,
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
  commentUser: { fontSize: 13, fontWeight: "700", color: "#1F2937" },
  commentTime: { fontSize: 11, color: "#D1D5DB" },
  commentText: { fontSize: 14, color: "#374151", lineHeight: 20 },
  emptyComments: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyCommentsTitle: { fontSize: 16, fontWeight: "600", color: "#9CA3AF" },
  emptyCommentsSub: { fontSize: 13, color: "#D1D5DB" },
  
  // ✅ Input Row
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    maxHeight: 80,
    borderWidth: 1,
    borderColor: "#F0F0F8",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#6C63FF",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#E5E7EB" },
  
  reportSubtitle: { fontSize: 13, color: "#9CA3AF", marginBottom: 16, marginTop: 4 },
  reportOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 7,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "transparent",
  },
  reportOptionActive: { backgroundColor: "#EEF2FF", borderColor: "#C7D2FE" },
  reportOptionText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  reportOptionTextActive: { color: "#6C63FF", fontWeight: "600" },
  reportBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  }, 
  cancelBtnText: { color: "#6B7280", fontSize: 14, fontWeight: "600" },
  submitBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#6C63FF",
    alignItems: "center",
  },
  submitBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});