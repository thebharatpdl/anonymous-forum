import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import axios from "axios";
import { API_URL } from "../../src/config";
import { useFeed } from "../../context/FeedContext";

const MAX_CHARS = 280;

export default function CreatePostScreen() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const { triggerRefresh } = useFeed();

  const remainingChars = MAX_CHARS - content.length;
  const isDisabled = content.trim().length === 0 || loading;

  const createPost = async () => {
    if (isDisabled) return;

    try {
      setLoading(true);

      await axios.post(API_URL, {
        content,
        username: "anon_user",
      });

      setContent("");

      triggerRefresh(); // refresh feed instantly

    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.header}>Create Post</Text>

      {/* INPUT CARD */}
      <View style={styles.card}>
        <TextInput
          placeholder="What's on your mind?"
          placeholderTextColor="#999"
          value={content}
          onChangeText={setContent}
          multiline
          style={styles.input}
          maxLength={MAX_CHARS}
        />

        <View style={styles.footerRow}>
          <Text
            style={[
              styles.counter,
              remainingChars < 20 && styles.counterWarning,
            ]}
          >
            {remainingChars} left
          </Text>
        </View>
      </View>

      {/* POST BUTTON */}
      <TouchableOpacity
        style={[styles.button, isDisabled && styles.buttonDisabled]}
        onPress={createPost}
        disabled={isDisabled}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Post</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F5F5FA",
  },

  header: {
    fontSize: 26,
    fontWeight: "800",
    marginTop: 40,
    marginBottom: 20,
    color: "#1A1A2E",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 15,
    minHeight: 160,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },

  input: {
    fontSize: 16,
    color: "#333",
    textAlignVertical: "top",
    minHeight: 100,
  },

  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },

  counter: {
    fontSize: 12,
    color: "#999",
  },

  counterWarning: {
    color: "#FF4D6D",
  },

  button: {
    marginTop: 20,
    backgroundColor: "#FF4D6D",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  buttonDisabled: {
    backgroundColor: "#FFB3C1",
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});








// import React, { useState } from "react";
// import { View, Text, TextInput, Button, StyleSheet } from "react-native";
// import axios from "axios";
// import { API_URL } from "../../src/config";
// import { useFeed } from "../../context/FeedContext";

// export default function CreatePostScreen() {
//   const [content, setContent] = useState("");
//   const { triggerRefresh } = useFeed();

//   const createPost = async () => {
//     try {
//       await axios.post(API_URL, {
//         content,
//         username: "anon_user",
//       });

//       triggerRefresh(); // ✅ added — updates HomeScreen instantly
//       alert("Post created!");
//       setContent("");
//     } catch (error) {
//       console.log(error);
//       alert("Failed to post");
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Create Post</Text>

//       <TextInput
//         placeholder="What's on your mind?"
//         value={content}
//         onChangeText={setContent}
//         style={styles.input}
//       />

//       <Button title="Post" onPress={createPost} />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 20,
//     marginTop: 50,
//   },
//   title: {
//     fontSize: 22,
//     fontWeight: "bold",
//     marginBottom: 20,
//   },
//   input: {
//     borderWidth: 1,
//     padding: 10,
//     marginBottom: 20,
//     borderRadius: 8,
//   },
// });