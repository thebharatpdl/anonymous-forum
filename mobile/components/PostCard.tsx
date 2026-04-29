import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import { likePost, repostPost } from "../src/services/api";

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
  const [loadingLike, setLoadingLike] = useState(false);
  const [loadingRepost, setLoadingRepost] = useState(false);

  // ❤️ LIKE
  const handleLike = async () => {
    if (loadingLike || liked) return;

    setLiked(true);
    setLikes((prev) => prev + 1);

    try {
      setLoadingLike(true);

      const data = await likePost(post._id);

      setLikes(data.likes); // ✅ correct
    } catch (err) {
      console.log("Like error:", err);

      // rollback
      setLiked(false);
      setLikes((prev) => prev - 1);
    } finally {
      setLoadingLike(false);
    }
  };

  // 🔁 REPOST
  const handleRepost = async () => {
    if (loadingRepost || reposted) return;

    setReposted(true);

    try {
      setLoadingRepost(true);

      await repostPost(post._id); // ✅ use service only
    } catch (err) {
      console.log("Repost error:", err);
      setReposted(false);
    } finally {
      setLoadingRepost(false);
    }
  };

  const avatarColor = getColor(post.username);
  const avatarLetter = post.username?.charAt(0).toUpperCase() || "A";

  return (
    <View style={styles.card}>
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
          <Text style={styles.time}>Anonymous</Text>
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
          disabled={loadingLike}
        >
          {loadingLike ? (
            <ActivityIndicator size="small" color="red" />
          ) : (
            <Text style={styles.icon}>{liked ? "❤️" : "🤍"}</Text>
          )}

          <Text style={styles.text}>
            {likes} Like{likes !== 1 ? "s" : ""}
          </Text>
        </TouchableOpacity>

        {/* REPOST */}
        <TouchableOpacity
          style={styles.btn}
          onPress={handleRepost}
          disabled={loadingRepost}
        >
          {loadingRepost ? (
            <ActivityIndicator size="small" color="green" />
          ) : (
            <Text style={styles.icon}>
              {reposted ? "🔁" : "🔄"}
            </Text>
          )}

          <Text style={styles.text}>
            {reposted ? "Reposted" : "Repost"}
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

/* COLOR */
function getColor(str: string) {
  const colors = ["#FFB3C6", "#A8D8EA", "#B5EAD7", "#FFDAC1"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/* STYLES */
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
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontWeight: "bold" },
  username: { fontWeight: "bold" },
  time: { fontSize: 12, color: "gray" },
  content: { fontSize: 15, marginVertical: 10 },

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
});