import { View, Text, StyleSheet } from "react-native";

type Post = {
  _id: string;
  content: string;
  username: string;
};

export default function PostCard({ post }: { post: Post }) {
  return (
    <View style={styles.card}>
      <Text style={styles.content}>{post.content}</Text>
      <Text style={styles.user}>by {post.username}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 15,
    marginBottom: 10,
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
  },
  content: {
    fontSize: 16,
    marginBottom: 6,
  },
  user: {
    fontSize: 12,
    color: "gray",
  },
});