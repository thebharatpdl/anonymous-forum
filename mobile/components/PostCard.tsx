import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {Feather} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppDispatch } from "../src/redux/hooks";
import { likePostAsync, commentPostAsync, Post } from "../src/redux/postsSlice";
import { getOrCreateUserId } from "../services/userServices";
import axios from "axios";
import { API_URL } from "../src/config";

type PostCardProps = {
  post: Post;
};

type Comment = {
  content: string;
  username: string;
  createdAt?: string;
};

export default function PostCard({ post }: PostCardProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();

  // STATES
  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [localComments, setLocalComments] = useState<Comment[]>(post.comments || []);

  // LIKE POST
  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      await dispatch(likePostAsync(post._id)).unwrap();
    } catch (error) {
      console.error("Like error:", error);
      Alert.alert("Error", "Failed to like post");
    } finally {
      setIsLiking(false);
    }
  };

  // COMMENT POST
  const handleComment = async () => {
    if (!commentContent.trim()) return;
    if (isCommenting) return;
    setIsCommenting(true);
    try {
      const result = await dispatch(
        commentPostAsync({ postId: post._id, content: commentContent.trim() })
      ).unwrap();
      setLocalComments([result.comment, ...localComments]);
      setCommentContent("");
      Alert.alert("Success", "Comment added!");
    } catch (error) {
      console.error("Comment error:", error);
      Alert.alert("Error", "Failed to add comment");
    } finally {
      setIsCommenting(false);
    }
  };

  // REPOST
  const handleRepost = async () => {
    if (isReposting) return;
    setIsReposting(true);
    try {
      const response = await axios.post(`${API_URL}/repost/${post._id}`, {
        username: "anon_user",
      });
      if (response.data) {
        Alert.alert("Success", "Post reposted!");
      }
    } catch (error: any) {
      console.error("Repost error:", error);
      const errorMessage = error.response?.data?.error || "Failed to repost";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsReposting(false);
    }
  };

  // START CHAT - Fixed function
  const handleStartChat = async () => {
    try {
      const userId = await getOrCreateUserId();
      const roomId = [userId, post._id].sort().join("-");
      
      router.push({
        pathname: "/chat",
        params: { 
          roomId: roomId, 
          otherUserId: post._id 
        }
      });
    } catch (error) {
      console.error("Chat error:", error);
      Alert.alert("Error", "Could not start chat");
    }
  };

  // VIEW POST DETAIL
  const handleViewDetail = () => {
    router.push({
      pathname: "/post-detail",
      params: { post: JSON.stringify(post) }
    });
  };

  return (
    <>
      {/* MAIN CARD */}
      <TouchableOpacity onPress={handleViewDetail} activeOpacity={0.7}>
        <View style={styles.card}>
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.username}>{post.username}</Text>
            <Text style={styles.time}>
              {post.createdAt
                ? new Date(post.createdAt).toLocaleDateString()
                : "Just now"}
            </Text>
          </View>

          {/* CONTENT */}
          <Text style={styles.content}>{post.content}</Text>

          {/* ACTIONS */}
          <View style={styles.actions}>
            {/* LIKE */}
            <TouchableOpacity
              style={styles.actionButtonlike}
              onPress={handleLike}
              disabled={isLiking}
            >
              <Ionicons name="heart-outline" size={22} color="#FF6B6B" />
              <Text style={styles.actionText}>{post.likes || 0}</Text>
            </TouchableOpacity>

            {/* COMMENT */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setCommentModalVisible(true)}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#4CAF50" />
              <Text style={styles.actionText}>{localComments.length}</Text>
            </TouchableOpacity>

            {/* REPOST */}
            {/* <TouchableOpacity
              style={styles.actionButton}
              onPress={handleRepost}
              disabled={isReposting}
            >
              <Ionicons name="repeat-outline" size={20} color="#4CAF50" />
              <Text style={styles.actionText}>Repost</Text>
            </TouchableOpacity> */}

            {/* CHAT - New Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleStartChat}
            >
              <Feather name="send" size={20} color="#6366F1" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* COMMENT MODAL */}
      <Modal visible={commentModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* MODAL HEADER */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>

            {/* COMMENTS LIST */}
            <FlatList
              data={localComments}
              keyExtractor={(_, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <Text style={styles.commentUser}>{item.username}</Text>
                  <Text style={styles.commentText}>{item.content}</Text>
                  <Text style={styles.commentTime}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Just now"}
                  </Text>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyComments}>
                  <Text style={styles.emptyCommentsText}>No comments yet. Be the first!</Text>
                </View>
              }
            />

            {/* COMMENT INPUT */}
            <View style={styles.commentInputContainer}>
              <TextInput
                placeholder="Write comment..."
                value={commentContent}
                onChangeText={setCommentContent}
                style={styles.commentInput}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, isCommenting && styles.sendButtonDisabled]}
                onPress={handleComment}
                disabled={isCommenting}
              >
                <Text style={styles.sendText}>{isCommenting ? "Sending..." : "Send"}</Text>
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  username: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6C63FF",
  },
  time: {
    fontSize: 12,
    color: "#999",
  },
  content: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  actionButton: {
    flexDirection: "row",
  marginLeft: "auto",  
    gap: 6,
  },


  
    actionButtonlike: {
      flexDirection: "row",
      gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: "#666",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    height: "70%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeText: {
    color: "#6C63FF",
    fontWeight: "600",
  },
  commentItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  commentUser: {
    fontWeight: "700",
    marginBottom: 4,
    color: "#6C63FF",
  },
  commentText: {
    color: "#333",
    fontSize: 14,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 10,
    color: "#999",
  },
  emptyComments: {
    padding: 40,
    alignItems: "center",
  },
  emptyCommentsText: {
    color: "#999",
    fontSize: 14,
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
    marginTop: 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#F5F5FA",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: "#6C63FF",
    marginLeft: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sendButtonDisabled: {
    backgroundColor: "#C4C4D4",
  },
  sendText: {
    color: "#fff",
    fontWeight: "700",
  },
});