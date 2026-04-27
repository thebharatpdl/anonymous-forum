import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

type Post = {
  _id: string;
  content: string;
  username: string;
  likes?: number;
};

export default function PostCard({ post }: { post: Post }) {
  const [likes, setLikes] = useState(post.likes || 0);
  const [reposted, setReposted] = useState(false);

  return (
    <View style={styles.card}>
      {/* CONTENT */}
      <Text style={styles.content}>{post.content}</Text>
      <Text style={styles.user}>by {post.username}</Text>

      {/* ACTION BOX */}
      <View style={styles.actionBox}>
        
        {/* LIKE SECTION */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setLikes(likes + 1)}
        >
          <Text style={styles.icon}>❤️</Text>
          <Text style={styles.text}>Like</Text>
          <Text style={styles.count}>{likes}</Text>
        </TouchableOpacity>

        {/* DIVIDER */}
        <View style={styles.divider} />

        {/* REPOST SECTION */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setReposted(!reposted)}
        >
          <Text style={styles.icon}>{reposted ? "🔁" : "🔄"}</Text>
          <Text style={styles.text}>
            {reposted ? "Reposted" : "Repost"}
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 15,
    backgroundColor: "#f2f2f2",
    marginBottom: 10,
    borderRadius: 12,
  },

  content: {
    fontSize: 16,
    marginBottom: 5,
  },

  user: {
    fontSize: 12,
    color: "gray",
    marginBottom: 12,
  },

  // 🔥 ACTION BOX (MAIN CHANGE)
  actionBox: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 10,
    justifyContent: "space-between",
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },

  divider: {
    width: 5,
    backgroundColor: "#ddd",
  },

  icon: {
    fontSize: 18,
    marginRight: 5,
  },

  text: {
    fontSize: 13,
    marginRight: 5,
  },

  count: {
    fontSize: 13,
    color: "gray",
  },
});