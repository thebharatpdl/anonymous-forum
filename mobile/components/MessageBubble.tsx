import React, { useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ReactionBar from "./ReactionBar";

type Reaction = {
  emoji: string;
  userId: string;
};

export type Message = {
  _id?: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  readBy: string[];
  reactions: Reaction[];
};

type Props = {
  item: Message;
  isMyMessage: boolean;
  prevSenderId?: string;
  myUserId: string;
  onLongPress: (messageId: string, isMyMessage: boolean, y: number) => void;
  onReact: (messageId: string, emoji: string) => void;
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function MessageBubble({
  item,
  isMyMessage,
  prevSenderId,
  myUserId,
  onLongPress,
  onReact,
}: Props) {
  const showName = !isMyMessage && item.senderId !== prevSenderId;
  const isRead = item.readBy.length > 1;
  const scale = useRef(new Animated.Value(1)).current;
  const bubbleRef = useRef<View>(null);
  const hasReactions = (item.reactions ?? []).length > 0;

  // Debug log
  console.log(`💬 Message ${item._id} - hasReactions: ${hasReactions}, reactions count: ${item.reactions?.length || 0}`);

  const handleLongPress = () => {
    console.log("🔴 LONG PRESS on message:", item._id);
    
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    bubbleRef.current?.measure((_x, _y, _w, _h, _pageX, pageY) => {
      console.log("📏 Bubble position Y:", pageY);
      onLongPress(item._id ?? "", isMyMessage, pageY);
    });
  };

  return (
    <View style={[styles.row, isMyMessage ? styles.rowRight : styles.rowLeft]}>
      {/* Avatar for other user */}
      {!isMyMessage && (
        <View style={[styles.avatar, { opacity: showName ? 1 : 0 }]}>
          <Text style={styles.avatarText}>
            {item.senderName?.[0]?.toUpperCase() ?? "A"}
          </Text>
        </View>
      )}

      <View style={[styles.bubbleWrapper, isMyMessage ? { alignItems: "flex-end" } : { alignItems: "flex-start" }]}>
        
        {/* Sender name */}
        {showName && <Text style={styles.senderLabel}>{item.senderName}</Text>}

        {/* Message Bubble */}
        <Animated.View ref={bubbleRef} style={{ transform: [{ scale }] }}>
          <Pressable onLongPress={handleLongPress} delayLongPress={300}>
            <View style={[styles.bubble, isMyMessage ? styles.myBubble : styles.otherBubble]}>
              <Text style={[styles.bubbleText, isMyMessage ? styles.myBubbleText : styles.otherBubbleText]}>
                {item.content}
              </Text>
            </View>
          </Pressable>
        </Animated.View>

        {/* ✅ REACTIONS - Below the message bubble */}
        <ReactionBar
          reactions={item.reactions || []}
          myUserId={myUserId}
          onReact={(emoji) => {
            console.log("🎯 ReactionBar onReact called with emoji:", emoji, "for message:", item._id);
            onReact(item._id ?? "", emoji);
          }}
          isMyMessage={isMyMessage}
        />

        {/* Timestamp */}
        <View style={styles.meta}>
          <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
          {isMyMessage && (
            <Ionicons
              name={isRead ? "checkmark-done" : "checkmark"}
              size={12}
              color={isRead ? "#6C63FF" : "#9CA3AF"}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-end",
    gap: 6,
  },
  rowRight: { justifyContent: "flex-end" },
  rowLeft: { justifyContent: "flex-start" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  avatarText: { fontSize: 11, fontWeight: "700", color: "#6C63FF" },
  bubbleWrapper: { maxWidth: "74%" },
  senderLabel: {
    fontSize: 11,
    color: "#6C63FF",
    fontWeight: "600",
    marginBottom: 3,
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: "#6C63FF",
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E6EB",
  },
  bubbleText: { fontSize: 14.5, lineHeight: 20 },
  myBubbleText: { color: "#FFFFFF" },
  otherBubbleText: { color: "#1C1E21" },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginHorizontal: 4,
  },
  time: { fontSize: 10, color: "#9CA3AF" },
});