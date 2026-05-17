import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppDispatch } from "../src/redux/hooks";
import { likePostAsync, commentPostAsync, Post } from "../src/redux/postsSlice";
import { getCurrentUser } from "../services/authService";
import axios from "axios";
import { API_URL } from "../src/config";

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

// Avatar color from username
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

  const avatarColor = getAvatarColor(post.username || "A");
  const avatarLetter = (post.username || "A")[0].toUpperCase();

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    setLiked(!liked);
    try {
      await dispatch(likePostAsync(post._id)).unwrap();
    } catch {
      setLiked(!liked);
    } finally {
      setIsLiking(false);
    }
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
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: avatarColor + "18", borderColor: avatarColor + "40" }]}>
            <Text style={[styles.avatarText, { color: avatarColor }]}>{avatarLetter}</Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={[styles.username, { color: avatarColor }]}>{post.username}</Text>
            <Text style={styles.time}>
              {post.createdAt ? getRelativeTime(post.createdAt) : "Just now"}
            </Text>
          </View>
          <TouchableOpacity style={styles.moreBtn} onPress={handleRepost} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="ellipsis-horizontal" size={18} color="#C4C4D4" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <Text style={styles.content}>{post.content}</Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike} disabled={isLiking}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={20}
              color={liked ? "#F43F5E" : "#9CA3AF"}
            />
            <Text style={[styles.actionCount, liked && { color: "#F43F5E" }]}>
              {(post.likes || 0) + (liked ? 1 : 0)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => setCommentModalVisible(true)}>
            <Ionicons name="chatbubble-outline" size={19} color="#9CA3AF" />
            <Text style={styles.actionCount}>{localComments.length}</Text>
          </TouchableOpacity>

          <View style={styles.actionSpacer} />

          <TouchableOpacity style={styles.chatBtn} onPress={handleStartChat}>
            <Ionicons name="send" size={15} color="#6C63FF" />
            <Text style={styles.chatBtnText}>Message</Text>
          </TouchableOpacity>
        </View>
      </Pressable>

      {/* Comment Modal */}
      <Modal visible={commentModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setCommentModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={localComments}
              keyExtractor={(_, i) => i.toString()}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <View style={[
                    styles.commentAvatar,
                    { backgroundColor: getAvatarColor(item.username) + "18" }
                  ]}>
                    <Text style={[
                      styles.commentAvatarText,
                      { color: getAvatarColor(item.username) }
                    ]}>
                      {item.username[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.commentBody}>
                    <View style={styles.commentBodyTop}>
                      <Text style={[styles.commentUser, { color: getAvatarColor(item.username) }]}>
                        {item.username}
                      </Text>
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
                  <Text style={styles.emptyCommentsText}>No comments yet</Text>
                  <Text style={styles.emptyCommentsSub}>Be the first to reply</Text>
                </View>
              }
            />

            <View style={styles.commentInputRow}>
              <TextInput
                placeholder="Add a comment..."
                placeholderTextColor="#9CA3AF"
                value={commentContent}
                onChangeText={setCommentContent}
                style={styles.commentInput}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, !commentContent.trim() && styles.sendBtnDisabled]}
                onPress={handleComment}
                disabled={isCommenting || !commentContent.trim()}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
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
    padding: 16,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F0F0F8",
  },
  cardPressed: { opacity: 0.96, transform: [{ scale: 0.995 }] },

  // Header
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5,
  },
  avatarText: { fontSize: 15, fontWeight: "700" },
  headerMeta: { flex: 1 },
  username: { fontSize: 14, fontWeight: "700", marginBottom: 1 },
  time: { fontSize: 11, color: "#C4C4D4", fontWeight: "500" },
  moreBtn: { padding: 4 },

  // Content
  content: {
    fontSize: 15,
    color: "#1F2937",
    lineHeight: 23,
    marginBottom: 14,
    letterSpacing: 0.1,
  },

  divider: { height: 1, backgroundColor: "#F5F5FA", marginBottom: 12 },

  // Actions
  actions: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, backgroundColor: "#F9FAFB",
  },
  actionCount: { fontSize: 13, color: "#9CA3AF", fontWeight: "600" },
  actionSpacer: { flex: 1 },
  chatBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: "#EEF2FF",
    borderWidth: 1, borderColor: "#C7D2FE",
  },
  chatBtnText: { fontSize: 13, color: "#6C63FF", fontWeight: "700" },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    height: "72%", overflow: "hidden",
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#E5E7EB", alignSelf: "center", marginTop: 12, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center",
  },

  // Comments
  commentItem: {
    flexDirection: "row", gap: 10, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#F9FAFB",
  },
  commentAvatar: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  commentAvatarText: { fontSize: 13, fontWeight: "700" },
  commentBody: { flex: 1 },
  commentBodyTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 },
  commentUser: { fontSize: 13, fontWeight: "700" },
  commentTime: { fontSize: 11, color: "#D1D5DB" },
  commentText: { fontSize: 14, color: "#374151", lineHeight: 20 },
  emptyComments: { alignItems: "center", paddingVertical: 48, gap: 6 },
  emptyCommentsText: { fontSize: 15, fontWeight: "600", color: "#9CA3AF" },
  emptyCommentsSub: { fontSize: 13, color: "#D1D5DB" },

  // Input
  commentInputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  commentInput: {
    flex: 1, backgroundColor: "#F9FAFB", borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: "#111827", maxHeight: 80,
    borderWidth: 1, borderColor: "#F0F0F8",
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#6C63FF", alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#E5E7EB" },
});