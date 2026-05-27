import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Animated,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { getCurrentUser, getUserId } from "../services/authService";
import socketService from "../services/socket";

import { API_URL } from '../src/config';

type UserItem = {
  id: string;
  anonymousName: string;
  avatarColor: string;
  roomId?: string;
  lastMessage?: string;
};

type ChatRoom = {
  roomId: string;
  participants: { userId: string; name?: string; userName?: string }[];
  lastMessage?: { content: string; senderId: string; createdAt: string };
  updatedAt: string;
};

function getInitials(name?: string): string {
  if (!name) return "A";
  return name.charAt(0).toUpperCase();
}

const AVATAR_PALETTE = [
  { bg: "#EEF2FF", text: "#6C63FF" },
  { bg: "#FEF3C7", text: "#D97706" },
  { bg: "#DCFCE7", text: "#16A34A" },
  { bg: "#FCE7F3", text: "#DB2777" },
  { bg: "#E0F2FE", text: "#0284C7" },
  { bg: "#F3E8FF", text: "#9333EA" },
  { bg: "#FFF7ED", text: "#EA580C" },
  { bg: "#F0FDF4", text: "#15803D" },
];

function ChatRow({
  item,
  index,
  onPress,
}: {
  item: UserItem;
  index: number;
  onPress: () => void;
}) {
  const colors = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 260, delay: index * 45, useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0, tension: 80, friction: 12, delay: index * 45, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const hasMessage = !!item.lastMessage;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <Pressable
        style={({ pressed }) => [styles.chatRow, pressed && styles.chatRowPressed]}
        onPress={onPress}
      >
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: colors.bg }]}>
            <Text style={[styles.avatarText, { color: colors.text }]}>
              {getInitials(item.anonymousName)}
            </Text>
          </View>
          <View style={styles.onlineDot} />
        </View>

        {/* Content */}
        <View style={styles.chatContent}>
          <View style={styles.chatTop}>
            <Text style={styles.chatName} numberOfLines={1}>{item.anonymousName}</Text>
          </View>
          <Text
            style={[styles.chatPreview, !hasMessage && styles.chatPreviewEmpty]}
            numberOfLines={1}
          >
            {item.lastMessage || "Tap to start chatting"}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
      </Pressable>
    </Animated.View>
  );
}

export default function ChatListScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<UserItem[]>([]);
  const [filteredChats, setFilteredChats] = useState<UserItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myUserId, setMyUserId] = useState("");
  const [myUserName, setMyUserName] = useState("");
  const myUserIdRef = useRef("");
  const headerAnim = useRef(new Animated.Value(0)).current;

  const fetchRooms = useCallback(async (uid: string) => {
    try {
      const res = await fetch(`${API_URL}/chat/rooms/${uid}`);
      const rooms: ChatRoom[] = await res.json();
      rooms.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      const others: UserItem[] = rooms
        .map((room) => {
          const other = room.participants.find((p) => p.userId !== uid);
          if (!other) return null;
          return {
            id: other.userId,
            anonymousName: other.name ?? other.userName ?? "Anonymous",
            avatarColor: "#6C63FF",
            roomId: room.roomId,
            lastMessage: room.lastMessage?.content ?? "",
          };
        })
        .filter(Boolean) as UserItem[];
      setChats(others);
      setFilteredChats(others);
    } catch (err) {
      console.log("❌ fetchRooms error:", err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const uid = await getUserId();
      if (!uid) { setLoading(false); return; }
      myUserIdRef.current = uid;
      setMyUserId(uid);
      const me = await getCurrentUser();
      if (me) setMyUserName(me.anonymousName);
      socketService.connect(uid);
      const handle = (data: any) => {
        if (myUserIdRef.current) fetchRooms(myUserIdRef.current);
      };
      socketService.on("chat_updated", handle);
      socketService.on("new_message", handle);
      await fetchRooms(uid);
      setLoading(false);
      Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      return () => {
        socketService.off("chat_updated", handle);
        socketService.off("new_message", handle);
      };
    };
    init();
  }, []);

  useFocusEffect(useCallback(() => {
    if (myUserIdRef.current) fetchRooms(myUserIdRef.current);
  }, [fetchRooms]));

  useEffect(() => {
    if (!search.trim()) setFilteredChats(chats);
    else setFilteredChats(chats.filter(c =>
      c.anonymousName.toLowerCase().includes(search.toLowerCase())
    ));
  }, [search, chats]);

  const startChat = async (otherUser: UserItem) => {
    if (!myUserId) { Alert.alert("Error", "Please login first"); return; }
    try {
      let roomId = otherUser.roomId;
      if (!roomId) {
        const res = await fetch(`${API_URL}/chat/room`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId1: myUserId, userId2: otherUser.id,
            userName1: myUserName, userName2: otherUser.anonymousName,
          }),
        });
        const room = await res.json();
        if (!room.roomId) throw new Error("No roomId");
        roomId = room.roomId;
      }
      router.push({
        pathname: "/chat",
        params: { roomId, otherUserId: otherUser.id, otherUserName: otherUser.anonymousName },
      });
    } catch {
      Alert.alert("Error", "Could not open chat");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loaderText}>Loading conversations…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Messages</Text>
          {chats.length > 0 && (
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{chats.length}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push("/find-people")}
        >
          <Ionicons name="create-outline" size={20} color="#6C63FF" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={17} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations…"
          placeholderTextColor="#C4C4D4"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={17} color="#C4C4D4" />
          </TouchableOpacity>
        )}
      </View>

      {/* Section label */}
      {filteredChats.length > 0 && (
        <View style={styles.sectionRow}>
          <Text style={styles.sectionText}>
            {search ? `${filteredChats.length} result${filteredChats.length !== 1 ? "s" : ""}` : "Recent"}
          </Text>
          <View style={styles.sectionLine} />
        </View>
      )}

      {/* List */}
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ChatRow item={item} index={index} onPress={() => startChat(item)} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchRooms(myUserIdRef.current)}
            tintColor="#6C63FF"
          />
        }
        contentContainerStyle={
          filteredChats.length === 0 ? styles.emptyContent : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="chatbubbles-outline" size={36} color="#6C63FF" />
            </View>
            <Text style={styles.emptyTitle}>
              {search ? "No results found" : "No messages yet"}
            </Text>
            <Text style={styles.emptySub}>
              {search
                ? "Try a different search term"
                : "Message someone from their post to get started"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5FB" },
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F5F5FB", gap: 12 },
  loaderText: { fontSize: 14, color: "#9CA3AF", fontWeight: "500" },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: "#F5F5FB",
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#EBEBF5",
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#111827", letterSpacing: -0.5 },
  countPill: {
    backgroundColor: "#EEF2FF", borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: "#C7D2FE",
  },
  countPillText: { fontSize: 12, fontWeight: "700", color: "#6C63FF" },
  newBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#C7D2FE",
  },

  // Search
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFFFFF", borderRadius: 16,
    marginHorizontal: 16, marginBottom: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: "#EBEBF5",
  },
  searchInput: { flex: 1, fontSize: 15, color: "#111827", padding: 0 },

  // Section
  sectionRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, marginBottom: 8, gap: 10,
  },
  sectionText: { fontSize: 11, fontWeight: "700", color: "#C4C4D4", letterSpacing: 0.8 },
  sectionLine: { flex: 1, height: 1, backgroundColor: "#EBEBF5" },

  // List
  listContent: { paddingHorizontal: 14, paddingBottom: 100 },
  emptyContent: { flex: 1 },

  // Chat Row
  chatRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: "#F0F0F8",
  },
  chatRowPressed: { opacity: 0.96, transform: [{ scale: 0.99 }] },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 52, height: 52, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "800" },
  onlineDot: {
    position: "absolute", bottom: 0, right: 0,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: "#10B981", borderWidth: 2.5, borderColor: "#FFFFFF",
  },
  chatContent: { flex: 1, gap: 3 },
  chatTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chatName: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1 },
  chatPreview: { fontSize: 13, color: "#9CA3AF", fontWeight: "400" },
  chatPreviewEmpty: { fontStyle: "italic" },

  // Empty
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 48, paddingTop: 80 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center", lineHeight: 19 },
});