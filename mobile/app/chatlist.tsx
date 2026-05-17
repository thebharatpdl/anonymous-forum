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
  TextInput,
  Alert,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getCurrentUser, getUserId } from "../services/authService";

const API_URL = "http://192.168.1.69:5000/api";

type UserItem = {
  id: string;
  anonymousName: string;
  avatarColor: string;
};

function getInitials(name?: string): string {
  if (!name) return "A";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const AVATAR_GRADIENTS = [
  { bg: "#EEF2FF", text: "#6C63FF", border: "#C7D2FE" },
  { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
  { bg: "#DCFCE7", text: "#16A34A", border: "#BBF7D0" },
  { bg: "#FCE7F3", text: "#DB2777", border: "#FBCFE8" },
  { bg: "#E0F2FE", text: "#0284C7", border: "#BAE6FD" },
  { bg: "#F3E8FF", text: "#9333EA", border: "#E9D5FF" },
  { bg: "#FFF7ED", text: "#EA580C", border: "#FED7AA" },
  { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
];

// ─── Animated User Row ────────────────────────────────────────────────────────

function UserRow({
  item,
  index,
  onPress,
  starting,
}: {
  item: UserItem;
  index: number;
  onPress: () => void;
  starting: boolean;
}) {
  const colors = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(16)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 280,
        delay: index * 40, useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0, tension: 80, friction: 12,
        delay: index * 40, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <Pressable
        style={({ pressed }) => [styles.userRow, pressed && styles.userRowPressed]}
        onPress={onPress}
        disabled={starting}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Text style={[styles.avatarText, { color: colors.text }]}>
            {getInitials(item.anonymousName)}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.anonymousName}
          </Text>
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.userStatus}>Anonymous · Tap to chat</Text>
          </View>
        </View>

        {/* Action */}
        {starting ? (
          <ActivityIndicator size="small" color="#6C63FF" />
        ) : (
          <View style={[styles.chatIconBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Ionicons name="chatbubble-ellipses" size={16} color={colors.text} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ChatListScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingChat, setStartingChat] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState("");
  const [myUserName, setMyUserName] = useState("");
  const headerAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUsers();
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(
        users.filter((u) =>
          u.anonymousName.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, users]);

  async function loadUsers(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    const uid = await getUserId();
    if (uid) setMyUserId(uid);
    const me = await getCurrentUser();
    if (me) setMyUserName(me.anonymousName);
    try {
      const res = await fetch(`${API_URL}/auth/users`);
      const data = await res.json();
      const others = data.filter((u: UserItem) => u.id !== uid);
      setUsers(others);
      setFilteredUsers(others);
    } catch {
      Alert.alert("Error", "Failed to load users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const startChat = async (otherUser: UserItem) => {
    if (!myUserId) { Alert.alert("Error", "Please login first"); return; }
    setStartingChat(otherUser.id);
    try {
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
      router.push({
        pathname: "/chat",
        params: {
          roomId: room.roomId,
          otherUserId: otherUser.id,
          otherUserName: otherUser.anonymousName,
        },
      });
    } catch {
      Alert.alert("Error", "Could not start chat. Please try again.");
    } finally {
      setStartingChat(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loaderText}>Finding people…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>

      {/* ── Header ── */}
      <Animated.View style={[styles.header, { opacity: headerAnim }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#1C1E21" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>People</Text>
          <View style={styles.headerCountPill}>
            <Text style={styles.headerCountText}>{users.length}</Text>
          </View>
        </View>

        <View style={{ width: 40 }} />
      </Animated.View>

      {/* ── Search ── */}
      <Animated.View style={[styles.searchWrap, { opacity: headerAnim }]}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search anonymous users…"
            placeholderTextColor="#C4C4D4"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#C4C4D4" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* ── Section Label ── */}
      {filteredUsers.length > 0 && (
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>
            {search ? `${filteredUsers.length} result${filteredUsers.length !== 1 ? "s" : ""}` : "All Users"}
          </Text>
          <View style={styles.sectionLine} />
        </View>
      )}

      {/* ── List ── */}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <UserRow
            item={item}
            index={index}
            onPress={() => startChat(item)}
            starting={startingChat === item.id}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadUsers(true)}
            tintColor="#6C63FF"
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="people-outline" size={40} color="#6C63FF" />
            </View>
            <Text style={styles.emptyTitle}>
              {search ? "No users found" : "No one here yet"}
            </Text>
            <Text style={styles.emptySub}>
              {search
                ? "Try searching with a different name"
                : "Check back later for more anonymous users"}
            </Text>
          </View>
        }
        contentContainerStyle={
          filteredUsers.length === 0 ? styles.emptyListContent : styles.listContent
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7FC" },
  loaderContainer: {
    flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F7FC", gap: 12,
  },
  loaderText: { fontSize: 14, color: "#9CA3AF", fontWeight: "500" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F7F7FC",
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#EBEBF5",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  headerCountPill: {
    backgroundColor: "#EEF2FF", borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: "#C7D2FE",
  },
  headerCountText: { fontSize: 12, fontWeight: "700", color: "#6C63FF" },

  // Search
  searchWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: "#EBEBF5",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#111827", padding: 0 },

  // Section Label
  sectionLabel: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 6, gap: 10,
  },
  sectionLabelText: { fontSize: 12, fontWeight: "700", color: "#9CA3AF", letterSpacing: 0.5 },
  sectionLine: { flex: 1, height: 1, backgroundColor: "#EBEBF5" },

  // List
  listContent: { paddingBottom: 40, paddingHorizontal: 12 },
  emptyListContent: { flex: 1 },
  separator: { height: 6 },

  // User Row
  userRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: "#F0F0F8",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  userRowPressed: { opacity: 0.95, transform: [{ scale: 0.99 }] },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, flexShrink: 0,
  },
  avatarText: { fontSize: 18, fontWeight: "800" },
  userInfo: { flex: 1, gap: 3 },
  userName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  onlineDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981",
  },
  userStatus: { fontSize: 12, color: "#9CA3AF", fontWeight: "500" },
  chatIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5,
  },

  // Empty
  emptyState: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 48, paddingTop: 80,
  },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: "#EEF2FF",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center", lineHeight: 19 },
});