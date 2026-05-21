import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
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
  return name[0].toUpperCase();
}

const AVATAR_COLORS = [
  { bg: "#EEF2FF", text: "#6C63FF" },
  { bg: "#FEF3C7", text: "#D97706" },
  { bg: "#DCFCE7", text: "#16A34A" },
  { bg: "#FCE7F3", text: "#DB2777" },
  { bg: "#E0F2FE", text: "#0284C7" },
  { bg: "#F3E8FF", text: "#9333EA" },
];

export default function FindPeopleScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState("");
  const [myUserName, setMyUserName] = useState("");

  useEffect(() => {
    loadUsers();
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

  async function loadUsers() {
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
      router.push({
        pathname: "/chat",
        params: {
          roomId: room.roomId,
          otherUserId: otherUser.id,
          otherUserName: otherUser.anonymousName,
        },
      });
    } catch {
      Alert.alert("Error", "Could not start chat");
    } finally {
      setStartingChat(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find People</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const colors = AVATAR_COLORS[index % AVATAR_COLORS.length];
          return (
            <TouchableOpacity
              style={styles.userRow}
              onPress={() => startChat(item)}
              disabled={startingChat === item.id}
            >
              <View style={[styles.avatar, { backgroundColor: colors.bg }]}>
                <Text style={[styles.avatarText, { color: colors.text }]}>
                  {getInitials(item.anonymousName)}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.anonymousName}</Text>
                <Text style={styles.userStatus}>Tap to start chatting</Text>
              </View>
              {startingChat === item.id ? (
                <ActivityIndicator size="small" color="#6C63FF" />
              ) : (
                <Ionicons name="chatbubble-outline" size={20} color="#6C63FF" />
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7FC" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, margin: 16, paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderWidth: 1, borderColor: "#EBEBF5" },
  searchInput: { flex: 1, fontSize: 15, color: "#111827" },
  userRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 18, marginHorizontal: 16, marginBottom: 8, padding: 14, gap: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700" },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  userStatus: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 100 },
  emptyText: { fontSize: 16, color: "#9CA3AF" },
});