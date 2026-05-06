import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch } from "../src/redux/hooks";
import { likePostAsync, Post } from "../src/redux/postsSlice";
import axios from "axios";
import { API_URL } from "../src/config";

type PostCardProps = {
  post: Post;
};

export default function PostCard({ post }: PostCardProps) {
  const dispatch = useAppDispatch();
  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);

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

  const handleRepost = async () => {
    if (isReposting) return;
    
    setIsReposting(true);
    try {
      const response = await axios.post(`${API_URL}/repost/${post._id}`, {
        username: "anon_user"
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
      <View style={styles.header}>
        <Text style={styles.username}>{post.username}</Text>
        <Text style={styles.time}>
          {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : "Just now"}
        </Text>
      </View>
      
      <Text style={styles.content}>{post.content}</Text>
      
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={handleLike}
          disabled={isLiking}
        >
          <Ionicons 
            name="heart-outline" 
            size={22} 
            color="#FF6B6B" 
          />
          <Text style={styles.actionText}>{post.likes || 0}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={handleRepost}
          disabled={isReposting}
        >
          <Ionicons 
            name="repeat-outline" 
            size={20} 
            color="#4CAF50" 
          />
          <Text style={styles.actionText}>Repost</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: "#666",
  },
});