// app/post-detail.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch } from "../src/redux/hooks";
import { commentPostAsync, likePostAsync } from "../src/redux/postsSlice";
import type { Comment, Post } from "../src/redux/postsSlice";


import { SafeAreaView } from "react-native-safe-area-context";

export default function PostDetail() {
  const { post: postParam } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const post: Post = postParam ? JSON.parse(postParam as string) : null;

  const [localComments, setLocalComments] = useState<Comment[]>(
    post?.comments || []
  );
  const [commentContent, setCommentContent] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [likes, setLikes] = useState(post?.likes || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [liked, setLiked] = useState(false);

  if (!post) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.errorText}>Post not found.</Text>
      </SafeAreaView>
    );
  }

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      const result = await dispatch(likePostAsync(post._id)).unwrap();
      setLikes(result.likes);
      setLiked((prev) => !prev);
    } catch {
      Alert.alert("Error", "Failed to like post");
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = async () => {
    if (!commentContent.trim()) return;
    if (isCommenting) return;
    setIsCommenting(true);
    try {
      const result = await dispatch(
        commentPostAsync({ postId: post._id, content: commentContent.trim() })
      ).unwrap();
      setLocalComments((prev) => [result.comment, ...prev]);
      setCommentContent("");
    } catch {
      Alert.alert("Error", "Failed to add comment");
    } finally {
      setIsCommenting(false);
    }
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentRow}>
      <View style={styles.commentAvatar}>
        <Text style={styles.commentAvatarText}>
          {(item.username?.[0] ?? "?").toUpperCase()}
        </Text>
      </View>
      <View style={styles.commentBubble}>
        <Text style={styles.commentUsername}>{item.username}</Text>
        <Text style={styles.commentText}>{item.content}</Text>
        {item.createdAt && (
          <Text style={styles.commentTime}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        )}
      </View>
    </View>
  );

  const ListHeader = () => (
    <View>
      {/* ── Post body ── */}
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(post.username?.[0] ?? "?").toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.postUsername}>{post.username}</Text>
            <Text style={styles.postTime}>
              {post.createdAt
                ? new Date(post.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "Just now"}
            </Text>
          </View>
        </View>

        <Text style={styles.postContent}>{post.content}</Text>

        {/* Counts row */}
        <View style={styles.countsRow}>
          <View style={styles.countItem}>
            <Ionicons name="heart" size={14} color="#FF6B6B" />
            <Text style={styles.countText}>{likes}</Text>
          </View>
          <Text style={styles.countText}>
            {localComments.length}{" "}
            {localComments.length === 1 ? "comment" : "comments"}
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Action buttons — Like / Comment */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleLike}
            disabled={isLiking}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={20}
              color={liked ? "#FF6B6B" : "#65676B"}
            />
            <Text style={[styles.actionLabel, liked && { color: "#FF6B6B" }]}>
              Like
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="chatbubble-outline" size={20} color="#65676B" />
            <Text style={styles.actionLabel}>Comment</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />
      </View>

      {/* Comments section label */}
      {localComments.length > 0 && (
        <Text style={styles.commentsLabel}>Comments</Text>
      )}
    </View>
  );

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1C1E21" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Post</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Comments list ── */}
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <FlatList
            data={localComments}
            keyExtractor={(_, i) => i.toString()}
            renderItem={renderComment}
            ListHeaderComponent={<ListHeader />}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="chatbubble-ellipses-outline" size={40} color="#C4C4C4" />
                <Text style={styles.emptyText}>No comments yet. Be first!</Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          {/* ── Comment input bar ── */}
          <View style={styles.inputBar}>
            <View style={styles.inputAvatar}>
              <Ionicons name="person" size={16} color="#fff" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Write a comment…"
              placeholderTextColor="#B0B3B8"
              value={commentContent}
              onChangeText={setCommentContent}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!commentContent.trim() || isCommenting) && styles.sendBtnDisabled,
              ]}
              onPress={handleComment}
              disabled={!commentContent.trim() || isCommenting}
            >
              <Ionicons
                name="send"
                size={18}
                color={commentContent.trim() && !isCommenting ? "#6C63FF" : "#B0B3B8"}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F0F2F5",
  },
  keyboardView: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  errorText: {
    textAlign: "center",
    marginTop: 40,
    color: "#65676B",
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E4E6EB",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F2F5",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1E21",
  },

  // Post card
  postCard: {
    backgroundColor: "#fff",
    marginBottom: 8,
    paddingTop: 16,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#6C63FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  postUsername: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1C1E21",
  },
  postTime: {
    fontSize: 12,
    color: "#65676B",
    marginTop: 1,
  },
  postContent: {
    fontSize: 15,
    color: "#1C1E21",
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  countsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  countItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  countText: {
    fontSize: 13,
    color: "#65676B",
  },
  divider: {
    height: 1,
    backgroundColor: "#E4E6EB",
    marginHorizontal: 16,
  },
  actionRow: {
    flexDirection: "row",
    paddingVertical: 2,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#65676B",
  },

  // Comments section
  commentsLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#65676B",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: "#F0F2F5",
  },
  commentRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 10,
    alignItems: "flex-start",
    gap: 8,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#6C63FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  commentAvatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1C1E21",
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: "#1C1E21",
    lineHeight: 20,
  },
  commentTime: {
    fontSize: 11,
    color: "#B0B3B8",
    marginTop: 4,
  },
  emptyBox: {
    alignItems: "center",
    paddingTop: 40,
    gap: 10,
  },
  emptyText: {
    color: "#B0B3B8",
    fontSize: 14,
  },

  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E4E6EB",
    gap: 8,
  },
  inputAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#6C63FF",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#F0F2F5",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1C1E21",
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});