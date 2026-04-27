import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import axios from "axios";
import { API_URL } from "../../src/config";

export default function CreatePostScreen() {
  const [content, setContent] = useState("");

  const createPost = async () => {
    try {
      await axios.post(API_URL, {
        content,
        username: "anon_user",
      });

      alert("Post created!");

      setContent(""); // clear input
    } catch (error) {
      console.log(error);
      alert("Failed to post");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Post</Text>

      <TextInput
        placeholder="What's on your mind?"
        value={content}
        onChangeText={setContent}
        style={styles.input}
      />

      <Button title="Post" onPress={createPost} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    marginTop: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 20,
    borderRadius: 8,
  },
});