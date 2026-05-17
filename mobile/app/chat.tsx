import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import socketService from "../services/socket";
import { getCurrentUser } from "../services/authService";
import MessageBubble, { Message } from "../components/MessageBubble";
import ReactionPicker from "../components/ReactionPicker";
import ChatMenu from "../components/ChatMenu";
import ChatSearch from "../components/ChatSearch";

// ─── Types ────────────────────────────────────────────────────────────────────

type Reaction = {
  emoji: string;
  userId: string;
};

type TypingEvent = {
  userId: string;
  isTyping: boolean;
};

// ─── Typing Dots ─────────────────────────────────────────────────────────────

function TypingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - i * 150),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.typingBubble}>
      <View style={styles.typingDots}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                opacity: dot,
                transform: [{
                  translateY: dot.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -3],
                  }),
                }],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { roomId, otherUserName, otherUserId } = useLocalSearchParams<{
    roomId: string;
    otherUserName?: string;
    otherUserId?: string;
  }>();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  // Reaction picker
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMessageId, setPickerMessageId] = useState("");
  const [pickerIsMyMessage, setPickerIsMyMessage] = useState(false);
  const [pickerBubbleY, setPickerBubbleY] = useState(0);

  // Chat Menu & Search
  const [menuVisible, setMenuVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<any>(null);
  const userIdRef = useRef("");

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    initializeChat();
    return () => cleanupChat();
  }, []);

  const initializeChat = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert("Error", "Please login first");
        router.back();
        return;
      }

      setUserId(user.id);
      setUserName(user.anonymousName);
      userIdRef.current = user.id;

      socketService.connect(user.id);

      socketService.on("new_message", (message: Message) => {
        setMessages((prev) => [
          ...prev,
          { ...message, reactions: message.reactions ?? [] },
        ]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      });

      socketService.on("user_typing", (data: TypingEvent) => {
        if (data.userId !== userIdRef.current) setOtherUserTyping(data.isTyping);
      });

      socketService.on("reaction_updated", ({ messageId, reactions }: { messageId: string; reactions: Reaction[] }) => {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
        );
      });

      socketService.emit("join_chat", { roomId, userId: user.id });
      await fetchChatHistory();
      setLoading(false);
    } catch (error) {
      console.error("Init error:", error);
      setLoading(false);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const res = await fetch(
        `http://192.168.1.69:5000/api/chat/history/${roomId}`
      );
      const data = await res.json();
      setMessages(
        data.map((m: Message) => ({ ...m, reactions: m.reactions ?? [] }))
      );
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: false }),
        100
      );
    } catch (err) {
      console.log("Error fetching history:", err);
    }
  };

  const cleanupChat = () => {
    socketService.off("new_message");
    socketService.off("user_typing");
    socketService.off("reaction_updated");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    setInputText("");
    if (isTyping) {
      setIsTyping(false);
      socketService.emit("typing", { roomId, userId, isTyping: false });
    }
    socketService.emit("send_message", {
      roomId,
      message: text,
      senderId: userId,
      senderName: userName || "Anonymous",
    });
    setSending(false);
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      socketService.emit("typing", { roomId, userId, isTyping: true });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (text.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socketService.emit("typing", { roomId, userId, isTyping: false });
      }, 2000);
    } else {
      setIsTyping(false);
      socketService.emit("typing", { roomId, userId, isTyping: false });
    }
  };

  const handleLongPress = (
    messageId: string,
    isMyMessage: boolean,
    y: number
  ) => {
    if (!messageId) return;
    setPickerMessageId(messageId);
    setPickerIsMyMessage(isMyMessage);
    setPickerBubbleY(y);
    setPickerVisible(true);
  };

  const handleReact = (messageId: string, emoji: string) => {
    if (!messageId || !userId) return;
    socketService.emit("react_message", {
      roomId,
      messageId,
      emoji,
      userId,
    });
  };

  const scrollToMessage = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isMyMessage = item.senderId === userId;
      const prevSenderId =
        index > 0 ? messages[index - 1].senderId : undefined;
      return (
        <MessageBubble
          item={item}
          isMyMessage={isMyMessage}
          prevSenderId={prevSenderId}
          myUserId={userId}
          onLongPress={handleLongPress}
          onReact={handleReact}
        />
      );
    },
    [userId, messages]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loader}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loaderText}>Loading messages…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Reaction Picker */}
      <ReactionPicker
        visible={pickerVisible}
        isMyMessage={pickerIsMyMessage}
        bubbleY={pickerBubbleY}
        onSelect={(emoji) => handleReact(pickerMessageId, emoji)}
        onClose={() => setPickerVisible(false)}
      />

      {/* Chat Menu Modal */}
      <ChatMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onSearch={() => {
          setMenuVisible(false);
          setSearchVisible(true);
        }}
        onBlock={() => Alert.alert("Blocked", "User has been blocked (Demo)")}
        onDelete={() => Alert.alert("Deleted", "Chat deleted (Demo)")}
      />

      {/* Chat Search Modal */}
      <ChatSearch
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        messages={messages}
        onResultPress={scrollToMessage}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={22} color="#1C1E21" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {(otherUserName ?? "A")[0].toUpperCase()}
            </Text>
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.headerName}>{otherUserName ?? "Anonymous"}</Text>
            <Text style={styles.headerStatus}>
              {otherUserTyping ? "Typing…" : "Active now"}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.headerAction}>
          <Ionicons name="ellipsis-vertical" size={20} color="#1C1E21" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, i) => item._id ?? i.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.messagesList}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => flatListRef.current?.scrollToIndex({ index: info.index, animated: true }), 100);
        }}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <View style={styles.emptyChatIcon}>
              <Ionicons name="chatbubbles-outline" size={32} color="#6C63FF" />
            </View>
            <Text style={styles.emptyChatText}>Say hello!</Text>
            <Text style={styles.emptyChatSub}>
              This is the beginning of your conversation.
            </Text>
          </View>
        }
        ListFooterComponent={otherUserTyping ? <TypingDots /> : null}
      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <SafeAreaView edges={["bottom"]} style={styles.inputSafeArea}>
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Message…"
              placeholderTextColor="#B0B3B8"
              value={inputText}
              onChangeText={handleTyping}
              multiline
              maxLength={1000}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                inputText.trim() ? styles.sendBtnActive : styles.sendBtnInactive,
                pressed && { opacity: 0.75 },
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
            >
              <Ionicons
                name="send"
                size={18}
                color={inputText.trim() ? "#FFFFFF" : "#B0B3B8"}
              />
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F5F9" },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F5F9",
  },
  loaderText: { marginTop: 12, fontSize: 14, color: "#65676B" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E4E6EB",
    gap: 8,
  },
  headerBack: { padding: 8 },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { fontSize: 16, fontWeight: "700", color: "#6C63FF" },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerName: { fontSize: 15, fontWeight: "700", color: "#1C1E21" },
  headerStatus: { fontSize: 11, color: "#65676B", marginTop: 1 },
  headerAction: { padding: 8 },
  messagesList: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,
  },
  emptyChat: {
    flex: 1,
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyChatIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyChatText: { fontSize: 16, fontWeight: "700", color: "#1C1E21" },
  emptyChatSub: {
    fontSize: 13,
    color: "#65676B",
    textAlign: "center",
    marginTop: 6,
  },
  typingBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginLeft: 34,
    marginBottom: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E6EB",
  },
  typingDots: { flexDirection: "row", gap: 4, alignItems: "center" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#9CA3AF" },
  inputSafeArea: { backgroundColor: "#FFFFFF" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E4E6EB",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#F0F2F5",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 10 : 8,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14.5,
    color: "#1C1E21",
    maxHeight: 120,
    lineHeight: 20,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  sendBtnActive: { backgroundColor: "#6C63FF" },
  sendBtnInactive: { backgroundColor: "#F0F2F5" },
});