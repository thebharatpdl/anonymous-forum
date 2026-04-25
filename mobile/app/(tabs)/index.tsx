import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import PostCard from  "../../components/PostCard";
import { dummyPosts } from  "../../src/dummyPost"

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Anonymous Feed</Text>

      <FlatList style={styles.contentbox}
        data={dummyPosts}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <PostCard post={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // padding: 20,
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
    textShadowColor: "rgba(31, 237, 24, 0.93)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});