import React, { useEffect, useState, useCallback, useRef } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { getCurrentUser, getUserId } from "../services/authService";
import socketService from "../services/socket";

const API_URL = "http://192.168.1.69:5000/api";

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

const AVATAR_COLORS = [
  { bg: "#EEF2FF", text: "#6C63FF" },
  { bg: "#FEF3C7", text: "#D97706" },
  { bg: "#DCFCE7", text: "#16A34A" },
  { bg: "#FCE7F3", text: "#DB2777" },
  { bg: "#E0F2FE", text: "#0284C7" },
  { bg: "#F3E8FF", text: "#9333EA" },
];

function ChatRow({ item, index, onPress }: { item: UserItem; index: number; onPress: () => void }) {
  const colors = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity style={styles.chatRow} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.avatar, { backgroundColor: colors.bg }]}>
          <Text style={[styles.avatarText, { color: colors.text }]}>{getInitials(item.anonymousName)}</Text>
        </View>
        <View style={styles.chatContent}>
          <Text style={styles.chatName} numberOfLines={1}>{item.anonymousName}</Text>
          <Text style={styles.chatPreview} numberOfLines={1}>{item.lastMessage || "Tap to start chatting"}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#C4C4D4" />
      </TouchableOpacity>
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
  const headerAnim = useRef(new Animated.Value(0)).current;
  const myUserIdRef = useRef("");

  const fetchRooms = useCallback(async (uid: string) => {
    console.log("🔄 fetchRooms called for:", uid);
    try {
      const res = await fetch(`${API_URL}/chat/rooms/${uid}`);
      const rooms: ChatRoom[] = await res.json();
      console.log("📋 Rooms fetched:", rooms.length);

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

      console.log("👥 Users extracted:", others.length);
      setChats(others);
      setFilteredChats(others);
    } catch (err) {
      console.log("❌ fetchRooms error:", err);
    }
  }, []);

  // Connect socket and register listeners ONCE on mount
  useEffect(() => {
    const init = async () => {
      const uid = await getUserId();
      if (!uid) { setLoading(false); return; }
      
      myUserIdRef.current = uid;
      setMyUserId(uid);
      const me = await getCurrentUser();
      if (me) setMyUserName(me.anonymousName);

      socketService.connect(uid);

      const handleChatUpdate = (data: any) => {
        console.log("🔔 chat_updated received in chatlist:", data);
        if (myUserIdRef.current) fetchRooms(myUserIdRef.current);
      };

      socketService.on("chat_updated", handleChatUpdate);
      socketService.on("new_message", handleChatUpdate);

      await fetchRooms(uid);
      setLoading(false);
      Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

      return () => {
        socketService.off("chat_updated", handleChatUpdate);
        socketService.off("new_message", handleChatUpdate);
      };
    };
    init();
  }, []);

  // Refresh when screen comes into focus
  useFocusEffect(useCallback(() => {
    if (myUserIdRef.current) fetchRooms(myUserIdRef.current);
  }, [fetchRooms]));

  // Filter by search
  useEffect(() => {
    if (!search.trim()) {
      setFilteredChats(chats);
    } else {
      setFilteredChats(chats.filter(c => c.anonymousName.toLowerCase().includes(search.toLowerCase())));
    }
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
            userId1: myUserId,
            userId2: otherUser.id,
            userName1: myUserName,
            userName2: otherUser.anonymousName,
          }),
        });
        const room = await res.json();
        if (!room.roomId) throw new Error("No roomId");
        roomId = room.roomId;
      }
      router.push({ pathname: "/chat", params: { roomId, otherUserId: otherUser.id, otherUserName: otherUser.anonymousName } });
    } catch (err) {
      Alert.alert("Error", "Could not open chat");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loaderText}>Loading conversations...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chats</Text>
        <TouchableOpacity onPress={() => router.push("/find-people")} style={styles.newChatBtn}>
          <Ionicons name="create-outline" size={22} color="#6C63FF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput style={styles.searchInput} placeholder="Search conversations..." value={search} onChangeText={setSearch} />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch("")}><Ionicons name="close-circle" size={18} color="#9CA3AF" /></TouchableOpacity>}
      </View>

      {filteredChats.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={48} color="#C4C4D4" />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySub}>Tap the + button to find people and start chatting</Text>
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <ChatRow item={item} index={index} onPress={() => startChat(item)} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchRooms(myUserIdRef.current)} tintColor="#6C63FF" />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7FC" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7F7FC" },
  loaderText: { fontSize: 14, color: "#9CA3AF", marginTop: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#EBEBF5" },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#111827" },
  newChatBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#EBEBF5" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, margin: 16, paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderWidth: 1, borderColor: "#EBEBF5" },
  searchInput: { flex: 1, fontSize: 15, color: "#111827" },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  chatRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, marginBottom: 8, gap: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700" },
  chatContent: { flex: 1 },
  chatName: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 4 },
  chatPreview: { fontSize: 13, color: "#9CA3AF" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#111827", marginBottom: 8 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
});