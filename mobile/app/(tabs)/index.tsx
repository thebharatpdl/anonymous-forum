import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import axios from "axios";
import { API_URL } from   "../../src/config"

// ✅ Define Post type
type Post = {
  _id: string;
  content: string;
  username: string;
};

export default function FeedScreen() {
  // ✅ Typed state (fixes "never" error)
  const [posts, setPosts] = useState<Post[]>([]);

  // 🔥 IMPORTANT: change localhost to your IP when testing on phone

  // Fetch posts from backend
  const fetchPosts = async () => {
    try {
      const res = await axios.get(API_URL);
      setPosts(res.data);
    } catch (err) {
      console.log("Error fetching posts:", err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // Render each post
  const renderItem = ({ item }: { item: Post }) => (
    <View style={styles.post}>
      <Text style={styles.content}>{item.content}</Text>
      <Text style={styles.user}>by {item.username}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Anonymous Feed</Text>

      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
      />
    </View>
  );
}

// 🎨 Basic styling
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    marginTop: 40,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  post: {
    padding: 15,
    backgroundColor: "#eee",
    marginBottom: 10,
    borderRadius: 8,
  },
  content: {
    fontSize: 16,
  },
  user: {
    fontSize: 12,
    color: "gray",
    marginTop: 5,
  },
});