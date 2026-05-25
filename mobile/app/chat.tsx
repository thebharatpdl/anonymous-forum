import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Animated,
  Pressable,
  Alert,
  Keyboard,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import socketService from "../services/socket";
import { getCurrentUser } from "../services/authService";
import MessageBubble, { Message } from "../components/MessageBubble";
import ReactionPicker from "../components/ReactionPicker";
import ChatMenu from "../components/ChatMenu";
import ChatSearch from "../components/ChatSearch";

const { height: screenHeight } = Dimensions.get("window");

type Reaction = { emoji: string; userId: string };
type TypingEvent = { userId: string; isTyping: boolean };

// ─── Avatar color ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = ["#6C63FF","#F43F5E","#10B981","#F59E0B","#3B82F6","#EC4899","#14B8A6","#8B5CF6"];
function getAvatarColor(name: string) {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

// ─── Typing Dots ─────────────────────────────────────────────────────────────
function TypingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 150),
        Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(600 - i * 150),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={styles.typingBubble}>
      <View style={styles.typingDots}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[
            styles.dot,
            { opacity: dot, transform: [{ translateY: dot.interpolate({ inputRange: [0,1], outputRange: [0,-3] }) }] },
          ]} />
        ))}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const { roomId, otherUserName, otherUserId } = useLocalSearchParams<{
    roomId: string; otherUserName?: string; otherUserId?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMessageId, setPickerMessageId] = useState("");
  const [pickerIsMyMessage, setPickerIsMyMessage] = useState(false);
  const [pickerBubbleY, setPickerBubbleY] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  
  // Keyboard state
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<any>(null);
  const userIdRef = useRef("");
  const inputRef = useRef<TextInput>(null);

  const avatarColor = getAvatarColor(otherUserName ?? "A");
  const avatarLetter = (otherUserName ?? "A")[0].toUpperCase();

  // Track keyboard height
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setKeyboardVisible(true);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    initializeChat();
    return () => cleanupChat();
  }, []);

  const initializeChat = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) { Alert.alert("Error", "Please login first"); router.back(); return; }
      setUserId(user.id);
      setUserName(user.anonymousName);
      userIdRef.current = user.id;
      socketService.connect(user.id);

      socketService.on("new_message", (message: Message) => {
        setMessages(prev => [...prev, { ...message, reactions: message.reactions ?? [] }]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      });
      socketService.on("user_typing", (data: TypingEvent) => {
        if (data.userId !== userIdRef.current) setOtherUserTyping(data.isTyping);
      });
      socketService.on("reaction_updated", ({ messageId, reactions }: { messageId: string; reactions: Reaction[] }) => {
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
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
      const res = await fetch(`http://192.168.1.69:5000/api/chat/history/${roomId}`);
      const data = await res.json();
      setMessages(data.map((m: Message) => ({ ...m, reactions: m.reactions ?? [] })));
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
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
      senderName: userName || "Anonymous" 
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

  const handleLongPress = (messageId: string, isMyMessage: boolean, y: number) => {
    if (!messageId) return;
    setPickerMessageId(messageId);
    setPickerIsMyMessage(isMyMessage);
    setPickerBubbleY(y);
    setPickerVisible(true);
  };

  const handleReact = (messageId: string, emoji: string) => {
    if (!messageId || !userId) return;
    socketService.emit("react_message", { roomId, messageId, emoji, userId });
  };

  const scrollToMessage = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isMyMessage = item.senderId === userId;
      const prevSenderId = index > 0 ? messages[index - 1].senderId : undefined;
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
      <SafeAreaView style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loaderText}>Loading messages…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ReactionPicker
        visible={pickerVisible}
        isMyMessage={pickerIsMyMessage}
        bubbleY={pickerBubbleY}
        onSelect={(emoji) => handleReact(pickerMessageId, emoji)}
        onClose={() => setPickerVisible(false)}
      />
      <ChatMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onSearch={() => { setMenuVisible(false); setSearchVisible(true); }}
        onBlock={() => Alert.alert("Blocked", "User has been blocked")}
        onDelete={() => Alert.alert("Deleted", "Chat deleted")}
      />
      <ChatSearch
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        messages={messages}
        onResultPress={scrollToMessage}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={[styles.headerAvatar, { backgroundColor: avatarColor + "18" }]}>
            <Text style={[styles.headerAvatarText, { color: avatarColor }]}>{avatarLetter}</Text>
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.headerName}>{otherUserName ?? "Anonymous"}</Text>
            <Text style={[styles.headerStatus, otherUserTyping && styles.headerStatusTyping]}>
              {otherUserTyping ? "Typing…" : "Active now"}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.headerMenuBtn} onPress={() => setMenuVisible(true)}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* ── Messages with dynamic padding when keyboard is open ── */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, i) => item._id ?? i.toString()}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.messagesList,
          keyboardVisible && { paddingBottom: keyboardHeight + 90 }
        ]}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollToIndexFailed={(info) => {
          setTimeout(() => flatListRef.current?.scrollToIndex({ index: info.index, animated: true }), 100);
        }}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <View style={[styles.emptyChatAvatar, { backgroundColor: avatarColor + "18" }]}>
              <Text style={[styles.emptyChatAvatarText, { color: avatarColor }]}>{avatarLetter}</Text>
            </View>
            <Text style={styles.emptyChatName}>{otherUserName ?? "Anonymous"}</Text>
            <View style={styles.emptyChatBadge}>
              <Ionicons name="shield-checkmark" size={11} color="#10B981" />
              <Text style={styles.emptyChatBadgeText}>Anonymous </Text>
            </View>
            <Text style={styles.emptyChatSub}>
              This is the beginning of your conversation.{"\n"}Say something! 👋
            </Text>
          </View>
        }
        ListFooterComponent={otherUserTyping ? <TypingDots /> : null}
      />

      {/* ── Input Bar with absolute positioning when keyboard is open ── */}
           {/* ── Input Bar with absolute positioning when keyboard is open ── */}
      {keyboardVisible ? (
        // When keyboard is open - position absolutely above keyboard with extra padding
<View style={[styles.inputAbsolute, { bottom: keyboardHeight + 25 }]}>
            <View style={styles.inputBar}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Message…"
              placeholderTextColor="#C4C4D4"
              value={inputText}
              onChangeText={handleTyping}
              multiline
              maxLength={1000}
              textAlignVertical="center"
              scrollEnabled={true}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                inputText.trim() ? styles.sendBtnActive : styles.sendBtnInactive,
                pressed && { opacity: 0.8 },
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
            >
              <Ionicons name="send" size={20} color={inputText.trim() ? "#FFFFFF" : "#C4C4D4"} />
            </Pressable>
          </View>
        </View>
      ) : (
        // When keyboard is closed - normal position with bottom inset
        <View style={[
          styles.inputContainer,
          { paddingBottom: Platform.OS === "android" ? Math.max(insets.bottom, 8) : insets.bottom }
        ]}>
          <View style={styles.inputBar}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Message…"
              placeholderTextColor="#C4C4D4"
              value={inputText}
              onChangeText={handleTyping}
              multiline
              maxLength={1000}
              textAlignVertical="center"
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                inputText.trim() ? styles.sendBtnActive : styles.sendBtnInactive,
                pressed && { opacity: 0.8 },
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
            >
              <Ionicons name="send" size={20} color={inputText.trim() ? "#FFFFFF" : "#C4C4D4"} />
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F5F5FB",
  },
  loaderWrap: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#F5F5FB", 
    gap: 12 
  },
  loaderText: { 
    fontSize: 14, 
    color: "#9CA3AF", 
    fontWeight: "500" 
  },

  // Header
  header: {
    flexDirection: "row", 
    alignItems: "center",
    backgroundColor: "#FFFFFF", 
    paddingHorizontal: 8, 
    paddingVertical: 10,
    borderBottomWidth: 1, 
    borderBottomColor: "#F0F0F8", 
    gap: 6,
  },
  headerBack: {
    width: 38, 
    height: 38, 
    borderRadius: 12,
    backgroundColor: "#F5F5FB", 
    alignItems: "center", 
    justifyContent: "center",
  },
  headerCenter: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 10 
  },
  headerAvatar: {
    width: 40, 
    height: 40, 
    borderRadius: 14,
    alignItems: "center", 
    justifyContent: "center", 
    position: "relative",
  },
  headerAvatarText: { 
    fontSize: 17, 
    fontWeight: "800" 
  },
  onlineDot: {
    position: "absolute", 
    bottom: 0, 
    right: 0,
    width: 11, 
    height: 11, 
    borderRadius: 6,
    backgroundColor: "#10B981", 
    borderWidth: 2, 
    borderColor: "#FFFFFF",
  },
  headerName: { 
    fontSize: 15, 
    fontWeight: "700", 
    color: "#111827" 
  },
  headerStatus: { 
    fontSize: 11, 
    color: "#9CA3AF", 
    marginTop: 1 
  },
  headerStatusTyping: { 
    color: "#6C63FF", 
    fontWeight: "600" 
  },
  headerMenuBtn: {
    width: 38, 
    height: 38, 
    borderRadius: 12,
    backgroundColor: "#F5F5FB", 
    alignItems: "center", 
    justifyContent: "center",
  },

  // Messages
  messagesList: { 
    paddingHorizontal: 12, 
    paddingTop: 16, 
    paddingBottom: 8,
  },

  // Empty chat
  emptyChat: { 
    alignItems: "center", 
    paddingTop: 60, 
    paddingHorizontal: 40 
  },
  emptyChatAvatar: {
    width: 72, 
    height: 72, 
    borderRadius: 24,
    alignItems: "center", 
    justifyContent: "center", 
    marginBottom: 12,
  },
  emptyChatAvatarText: { 
    fontSize: 30, 
    fontWeight: "800" 
  },
  emptyChatName: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#111827", 
    marginBottom: 6 
  },
  emptyChatBadge: {
    flexDirection: "row", 
    alignItems: "center", 
    gap: 4,
    backgroundColor: "#F0FDF4", 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: "#BBF7D0",
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    marginBottom: 16,
  },
  emptyChatBadgeText: { 
    fontSize: 11, 
    color: "#10B981", 
    fontWeight: "600" 
  },
  emptyChatSub: { 
    fontSize: 14, 
    color: "#9CA3AF", 
    textAlign: "center", 
    lineHeight: 21 
  },

  // Typing
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
  typingDots: { 
    flexDirection: "row", 
    gap: 4, 
    alignItems: "center" 
  },
  dot: { 
    width: 7, 
    height: 7, 
    borderRadius: 4, 
    backgroundColor: "#9CA3AF" 
  },

  // Input - Normal state (keyboard closed)
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F8",
  },
  // Input - Absolute position when keyboard is open
  inputAbsolute: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F8",
    paddingBottom: Platform.OS === "android" ? 12 : 0,
  },
  inputBar: {
    flexDirection: "row", 
    alignItems: "center",
    backgroundColor: "#FFFFFF", 
    paddingHorizontal: 12, 
    paddingVertical: 12,
    gap: 10,
  },
  input: {
    flex: 1, 
    backgroundColor: "#F5F5FB", 
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 12 : 10,
    paddingBottom: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16,
    color: "#111827", 
    minHeight: 44,
    maxHeight: 100, 
    borderWidth: 1, 
    borderColor: "#EBEBF5",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnActive: { 
    backgroundColor: "#6C63FF" 
  },
  sendBtnInactive: { 
    backgroundColor: "#F0F0F8" 
  },
});