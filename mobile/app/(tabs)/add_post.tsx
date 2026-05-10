import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import axios from "axios";
import { API_URL } from "../../src/config";
import { useAppDispatch } from "../../src/redux/hooks";
import { addPost } from "../../src/redux/postsSlice";

const MAX_CHARS = 280;
const { width } = Dimensions.get("window");

export default function CreatePostScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const headerSlide = useRef(new Animated.Value(-15)).current;

  const inputRef = useRef<TextInput>(null);

  const remainingChars = MAX_CHARS - content.length;
  const isDisabled = content.trim().length === 0 || loading;
  const charPercentage = (content.length / MAX_CHARS) * 100;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(headerSlide, {
        toValue: 0,
        tension: 70,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const getCharColor = () => {
    if (remainingChars < 0) return "#E5484D";
    if (remainingChars < 20) return "#F5A623";
    return "#5E5CE0";
  };

  const createPost = async () => {
    if (isDisabled) return;
    try {
      setLoading(true);
      const res = await axios.post(API_URL, {
        content: content.trim(),
        username: "anon_user",
      });
      dispatch(addPost(res.data));
      Alert.alert("Posted ✨", "Your message is now in the feed.", [
        { text: "Back to feed", onPress: () => router.back() },
      ]);
      setContent("");
    } catch (error) {
      Alert.alert("Error", "Could not post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (content.length > 0) {
      Alert.alert("Discard post?", "Your text will be lost.", [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  const MOODS = ["💡 Thought:", "✨ Idea:", "🔥 Hot take:", "💭 Random:"];

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <TouchableOpacity onPress={handleCancel} style={styles.iconBtn}>
            <Ionicons name="close-outline" size={24} color="#666" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.headerDot} />
            <Text style={styles.headerTitle}>Create post</Text>
          </View>

          <TouchableOpacity
            onPress={createPost}
            disabled={isDisabled}
            style={[styles.sendBtn, isDisabled && styles.sendBtnDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={14} color="#fff" />
                <Text style={styles.sendBtnText}>Post</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={[
            styles.body,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
       

          {/* Input card */}
          <View style={[styles.inputCard, isFocused && styles.inputCardFocused]}>
            <TextInput
              ref={inputRef}
              placeholder="What’s on your mind? Share anonymously..."
              placeholderTextColor="#9C9CBC"
              value={content}
              onChangeText={setContent}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              multiline
              style={styles.input}
              maxLength={MAX_CHARS}
              editable={!loading}
            />

            {/* Footer */}
            <View style={styles.inputFooter}>
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${charPercentage}%`,
                        backgroundColor: getCharColor(),
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.charCount, { color: getCharColor() }]}>
                  {remainingChars}
                </Text>
              </View>
              <View style={styles.inputMeta}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#8E8EA8" />
                <Text style={styles.metaText}>Anonymous · End-to-end encrypted</Text>
              </View>
            </View>
          </View>

          {/* Quick prompts */}
          <Text style={styles.sectionLabel}>Start with an idea</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.moodRow}
          >
            {MOODS.map((mood, i) => (
              <TouchableOpacity
                key={i}
                style={styles.moodChip}
                onPress={() => setContent((prev) => (prev ? prev : mood))}
                activeOpacity={0.7}
              >
                <Text style={styles.moodText}>{mood}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Privacy hint */}
          <View style={styles.hintRow}>
            <Ionicons name="eye-off-outline" size={16} color="#8E8EA8" />
            <Text style={styles.hintText}>
              Your identity is hidden. Everyone can see your post.
            </Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F8FC", // light neutral background
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFF4",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#5E5CE0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1C1E",
    letterSpacing: -0.3,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#5E5CE0",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 30,
    shadowColor: "#5E5CE0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  sendBtnDisabled: {
    backgroundColor: "#C6C6C8",
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  identityStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#EFEFF4",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  anonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
  },
  anonLabel: {
    fontSize: 12,
    color: "#8E8EA8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  anonName: {
    fontSize: 15,
    color: "#1C1C1E",
    fontWeight: "600",
  },
  liveBadge: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34C759",
  },
  liveText: {
    color: "#34C759",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  inputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EFEFF4",
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  inputCardFocused: {
    borderColor: "#5E5CE0",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  input: {
    fontSize: 17,
    color: "#1C1C1E",
    textAlignVertical: "top",
    minHeight: 140,
    maxHeight: 220,
    lineHeight: 24,
    padding: 20,
  },
  inputFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
  },
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressTrack: {
    width: 80,
    height: 4,
    backgroundColor: "#E9E9EF",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  charCount: {
    fontSize: 12,
    fontWeight: "600",
  },
  inputMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 11,
    color: "#8E8EA8",
    letterSpacing: 0.2,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6C6C80",
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  moodRow: {
    gap: 10,
    paddingBottom: 6,
  },
  moodChip: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#E9E9EF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  moodText: {
    color: "#5E5CE0",
    fontSize: 14,
    fontWeight: "500",
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 24,
    paddingHorizontal: 4,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: "#8E8EA8",
    lineHeight: 18,
  },
});