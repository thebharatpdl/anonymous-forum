// mobile/app/chats.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { getOrCreateUserId } from "../services/userServices";

// ─── Types ────────────────────────────────────────────────────────────────────

type Participant = {
  userId: string;
  name?: string;
};

type ChatRoom = {
  roomId: string;
  participants: Participant[];
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
  };
  unreadCount?: number;
  updatedAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

function getInitials(name?: string): string {
  if (!name) return "A";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Stable list of avatar bg colors by index
const AVATAR_COLORS = ["#EEF2FF", "#FEF3C7", "#DCFCE7", "#FCE7F3", "#E0F2FE"];
const AVATAR_TEXT_COLORS = ["#6C63FF", "#D97706", "#16A34A", "#DB2777", "#0284C7"];

// ─── Chat Row ─────────────────────────────────────────────────────────────────

function ChatRow({
  item,
  myUserId,
  index,
  onPress,
}: {
  item: ChatRoom;
  myUserId: string;
  index: number;
  onPress: () => void;
}) {
  const other = item.participants.find((p) => p.userId !== myUserId);
  const otherName = other?.name ?? "Anonymous";
  const initials = getInitials(otherName);
  const colorIdx = index % AVATAR_COLORS.length;

  const lastMsg = item.lastMessage;
  const isMyLast = lastMsg?.senderId === myUserId;
  const preview = lastMsg
    ? `${isMyLast ? "You: " : ""}${lastMsg.content}`
    : "Tap to start chatting";

  const hasUnread = (item.unreadCount ?? 0) > 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.chatRow, pressed && styles.chatRowPressed]}
      onPress={onPress}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: AVATAR_COLORS[colorIdx] }]}>
        <Text style={[styles.avatarText, { color: AVATAR_TEXT_COLORS[colorIdx] }]}>{initials}</Text>
      </View>

      {/* Body */}
      <View style={styles.chatBody}>
        <View style={styles.chatTop}>
          <Text style={[styles.chatName, hasUnread && styles.chatNameUnread]} numberOfLines={1}>
            {otherName}
          </Text>
          <Text style={[styles.chatTime, hasUnread && styles.chatTimeUnread]}>
            {formatRelativeTime(item.updatedAt)}
          </Text>
        </View>
        <View style={styles.chatBottom}>
          <Text
            style={[styles.chatPreview, hasUnread && styles.chatPreviewUnread]}
            numberOfLines={1}
          >
            {preview}
          </Text>
          {hasUnread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {(item.unreadCount ?? 0) > 99 ? "99+" : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ChatsScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myUserId, setMyUserId] = useState("");

  // Reload when screen comes into focus (e.g. after returning from a chat)
  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [])
  );

  const loadChats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const uid = await getOrCreateUserId();
    setMyUserId(uid);
    try {
      const res = await fetch(`http://192.168.1.69:5000/api/chat/rooms/${uid}`);
      const data: ChatRoom[] = await res.json();
      // Sort newest first
      data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setChats(data);
    } catch (err) {
      console.log("Error loading chats:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpen = (item: ChatRoom) => {
    const other = item.participants.find((p) => p.userId !== myUserId);
    router.push({
      pathname: "/chat",
      params: {
        roomId: item.roomId,
        otherUserId: other?.userId ?? "",
        otherUserName: other?.name ?? "Anonymous",
      },
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#1C1E21" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity
          style={styles.headerAction}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="create-outline" size={22} color="#1C1E21" />
        </TouchableOpacity>
      </View>

      {/* Search pill (decorative / future) */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#9CA3AF" />
        <Text style={styles.searchPlaceholder}>Search messages</Text>
      </View>

      {/* List */}
      {chats.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="chatbubbles-outline" size={36} color="#6C63FF" />
          </View>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySub}>
            When you start a conversation, it'll show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.roomId}
          renderItem={({ item, index }) => (
            <ChatRow
              item={item}
              myUserId={myUserId}
              index={index}
              onPress={() => handleOpen(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadChats(true)}
              tintColor="#6C63FF"
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E4E6EB",
  },
  headerBack: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1C1E21" },
  headerAction: { padding: 8 },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 12,
    marginTop: 10,
    backgroundColor: "#F0F2F5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchPlaceholder: { fontSize: 14, color: "#9CA3AF" },

  // List
  listContent: { paddingBottom: 32 },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#F0F2F5",
    marginLeft: 76,
  },

  // Chat Row
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  chatRowPressed: { backgroundColor: "#F8F9FC" },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 17, fontWeight: "700" },

  chatBody: { flex: 1, gap: 3 },
  chatTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chatName: { fontSize: 15, fontWeight: "500", color: "#1C1E21", flex: 1, marginRight: 8 },
  chatNameUnread: { fontWeight: "700" },
  chatTime: { fontSize: 12, color: "#9CA3AF", flexShrink: 0 },
  chatTimeUnread: { color: "#6C63FF", fontWeight: "600" },

  chatBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chatPreview: { fontSize: 13.5, color: "#65676B", flex: 1, marginRight: 8 },
  chatPreviewUnread: { color: "#1C1E21", fontWeight: "500" },

  badge: {
    backgroundColor: "#6C63FF",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    flexShrink: 0,
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },

  // Empty
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 48,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1C1E21" },
  emptySub: { fontSize: 14, color: "#65676B", textAlign: "center", marginTop: 8, lineHeight: 20 },
});