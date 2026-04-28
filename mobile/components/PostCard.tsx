import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import { API_URL } from "../src/config";

type Post = {
  _id: string;
  content: string;
  username: string;
  likes?: number;
  repostOf?: string | null;
};

export default function PostCard({ post }: { post: Post }) {
  const [likes, setLikes] = useState(post.likes || 0);
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [repostLoading, setRepostLoading] = useState(false);

  // ❤️ LIKE (Optimistic UI)
  const handleLike = async () => {
    if (likeLoading || liked) return;

    setLikes((prev) => prev + 1);
    setLiked(true);

    try {
      setLikeLoading(true);

      const res = await axios.post(
        `${API_URL}/like/${post._id}`
      );

      setLikes(res.data.likes);
    } catch (err) {
      console.log("Like error:", err);

      // rollback
      setLikes((prev) => prev - 1);
      setLiked(false);
    } finally {
      setLikeLoading(false);
    }
  };

  // 🔁 REPOST (Optimistic UI)
  const handleRepost = async () => {
    if (repostLoading || reposted) return;

    setReposted(true);

    try {
      setRepostLoading(true);

      await axios.post(
        `${API_URL}/repost/${post._id}`
      );

    } catch (err) {
      console.log("Repost error:", err);
      setReposted(false);
    } finally {
      setRepostLoading(false);
    }
  };

  // 🎨 Avatar generator
  const avatarColor = getColor(post.username);
  const avatarLetter = post.username?.charAt(0).toUpperCase() || "A";

  return (
    <View style={styles.card}>

      {/* REPOST TAG */}
      {post.repostOf && (
        <Text style={styles.repostTag}>🔁 Reposted</Text>
      )}

      {/* HEADER */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
        </View>

        <View>
          <Text style={styles.username}>{post.username}</Text>
          <Text style={styles.time}>Anonymous user</Text>
        </View>
      </View>

      {/* CONTENT */}
      <Text style={styles.content}>{post.content}</Text>

      {/* ACTIONS */}
      <View style={styles.actions}>

        {/* LIKE */}
        <TouchableOpacity
          style={styles.btn}
          onPress={handleLike}
          disabled={likeLoading}
        >
          {likeLoading ? (
            <ActivityIndicator size="small" color="red" />
          ) : (
            <Text style={styles.icon}>{liked ? "❤️" : "🤍"}</Text>
          )}

          <Text style={[styles.text, liked && styles.activeText]}>
            {likes} Like{likes !== 1 ? "s" : ""}
          </Text>
        </TouchableOpacity>

        {/* REPOST */}
        <TouchableOpacity
          style={styles.btn}
          onPress={handleRepost}
          disabled={repostLoading}
        >
          {repostLoading ? (
            <ActivityIndicator size="small" color="green" />
          ) : (
            <Text style={styles.icon}>
              {reposted ? "🔁" : "🔄"}
            </Text>
          )}

          <Text style={[styles.text, reposted && styles.activeText]}>
            {reposted ? "Reposted" : "Repost"}
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

/* 🎨 COLOR GENERATOR */
function getColor(str: string) {
  const colors = [
    "#FFB3C6", "#A8D8EA", "#B5EAD7",
    "#FFDAC1", "#C7CEEA", "#F9C74F"
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

/* 🎨 STYLES */
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    margin: 10,
    padding: 15,
    borderRadius: 12,
    elevation: 3,
  },

  repostTag: {
    fontSize: 12,
    color: "green",
    marginBottom: 5,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  avatarText: {
    color: "#fff",
    fontWeight: "bold",
  },

  username: {
    fontWeight: "bold",
  },

  time: {
    fontSize: 12,
    color: "gray",
  },

  content: {
    fontSize: 15,
    marginVertical: 10,
  },

  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },

  btn: {
    flexDirection: "row",
    alignItems: "center",
  },

  icon: {
    fontSize: 18,
    marginRight: 5,
  },

  text: {
    fontSize: 13,
    color: "gray",
  },

  activeText: {
    color: "#000",
    fontWeight: "600",
  },
});