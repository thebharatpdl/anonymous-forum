import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import axios from "axios";
import PostCard from "../../components/PostCard";
import { API_URL } from "../../src/config";

// ✅ Type definition
type Post = {
  _id: string;
  content: string;
  username: string;
    likes?: number;

};

export default function HomeScreen() {
  const [posts, setPosts] = useState<Post[]>([]);

  // 🔥 Fetch posts from backend
  const fetchPosts = async () => {
    try {
      const response = await axios.get(API_URL);
      
      console.log("Fetched posts:", response.data); // debug

      setPosts(response.data);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  // ✅ Run once on screen load
  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Anonymous Feed</Text>

      <FlatList
        style={styles.contentbox}
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <PostCard post={item} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No posts yet...</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 40,
  },
  contentbox: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    marginLeft: 10,
  },
  empty: {
    textAlign: "center",
    marginTop: 20,
    color: "gray",
  },
});