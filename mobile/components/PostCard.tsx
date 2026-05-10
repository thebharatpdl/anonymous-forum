import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppDispatch } from "../src/redux/hooks";
import { likePostAsync, Post } from "../src/redux/postsSlice";
import axios from "axios";
import { API_URL } from "../src/config";

type PostCardProps = {
  post: Post;
};

export default function PostCard({ post }: PostCardProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [likes, setLikes] = useState(post.likes || 0);
  const [liked, setLiked] = useState(false);

  // LIKE POST
  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      const result = await dispatch(likePostAsync(post._id)).unwrap();
      setLikes(result.likes);
      setLiked((prev) => !prev);
    } catch (error) {
      console.error("Like error:", error);
      Alert.alert("Error", "Failed to like post");
    } finally {
      setIsLiking(false);
    }
  };

  // OPEN POST DETAIL (Facebook-style comment view)
  const handleOpenComments = () => {
    router.push({
      pathname: "/post-detail",
      params: { post: JSON.stringify({ ...post, likes }) },
    });
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

  return (
    <View style={styles.card}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(post.username?.[0] ?? "?").toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.username}>{post.username}</Text>
          <Text style={styles.time}>
            {post.createdAt
              ? new Date(post.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              : "Just now"}
          </Text>
        </View>
      </View>

      {/* CONTENT */}
      <Text style={styles.content}>{post.content}</Text>

      {/* COUNTS */}
      {(likes > 0 || (post.comments?.length ?? 0) > 0) && (
        <View style={styles.countsRow}>
          {likes > 0 && (
            <View style={styles.countItem}>
              <Ionicons name="heart" size={13} color="#FF6B6B" />
              <Text style={styles.countText}>{likes}</Text>
            </View>
          )}
          {(post.comments?.length ?? 0) > 0 && (
            <TouchableOpacity onPress={handleOpenComments}>
              <Text style={styles.countText}>
                {post.comments!.length}{" "}
                {post.comments!.length === 1 ? "comment" : "comments"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* DIVIDER */}
      <View style={styles.divider} />

      {/* ACTIONS */}
      <View style={styles.actions}>
        {/* LIKE */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLike}
          disabled={isLiking}
        >
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={20}
            color={liked ? "#FF6B6B" : "#65676B"}
          />
          <Text style={[styles.actionText, liked && { color: "#FF6B6B" }]}>
            Like
          </Text>
        </TouchableOpacity>

        {/* COMMENT — opens full post detail */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleOpenComments}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#65676B" />
          <Text style={styles.actionText}>Comment</Text>
        </TouchableOpacity>

        {/* REPOST */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleRepost}
          disabled={isReposting}
        >
          <Ionicons name="repeat-outline" size={20} color="#65676B" />
          <Text style={styles.actionText}>Repost</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
    paddingTop: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#6C63FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
  },
  username: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1C1E21",
  },
  time: {
    fontSize: 12,
    color: "#65676B",
    marginTop: 1,
  },
  content: {
    fontSize: 15,
    color: "#1C1E21",
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 10,
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
  actions: {
    flexDirection: "row",
    paddingVertical: 2,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#65676B",
  },
});