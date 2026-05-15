import React, { useEffect, useState, useCallback, useRef } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { getCurrentUser, getUserId } from "../services/authService";

const API_URL = "http://192.168.1.69:5000/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserItem = {
  id: string;
  anonymousName: string;
  avatarColor: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string): string {
  if (!name) return "A";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const AVATAR_COLORS = ["#EEF2FF", "#FEF3C7", "#DCFCE7", "#FCE7F3", "#E0F2FE"];
const AVATAR_TEXT_COLORS = ["#6C63FF", "#D97706", "#16A34A", "#DB2777", "#0284C7"];

// ─── User Row Component ────────────────────────────────────────────────────────

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
  const colorIdx = index % AVATAR_COLORS.length;
  
  return (
    <Pressable
      style={({ pressed }) => [styles.userRow, pressed && styles.userRowPressed]}
      onPress={onPress}
      disabled={starting}
    >
      <View style={[styles.avatar, { backgroundColor: AVATAR_COLORS[colorIdx] }]}>
        <Text style={[styles.avatarText, { color: AVATAR_TEXT_COLORS[colorIdx] }]}>
          {getInitials(item.anonymousName)}
        </Text>
      </View>
      
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>
          {item.anonymousName}
        </Text>
        <Text style={styles.userStatus}>Tap to start chatting</Text>
      </View>
      
      {starting ? (
        <ActivityIndicator size="small" color="#6C63FF" />
      ) : (
        <Ionicons name="chatbubble-outline" size={20} color="#6C63FF" />
      )}
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ChatsScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingChat, setStartingChat] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string>("");
  const [myUserName, setMyUserName] = useState<string>("");

  // Load users when screen mounts
  useEffect(() => {
    loadUsers();
  }, []);

  // Filter users by search
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
    
    // Get current user ID
    const uid = await getUserId();
    if (uid) setMyUserId(uid);
    
    const me = await getCurrentUser();
    if (me) setMyUserName(me.anonymousName);
    
    try {
      const res = await fetch(`${API_URL}/auth/users`);
      const data = await res.json();
      // Exclude current user from list
      const otherUsers = data.filter((u: UserItem) => u.id !== uid);
      setUsers(otherUsers);
      setFilteredUsers(otherUsers);
    } catch (err) {
      console.log("Error loading users:", err);
      Alert.alert("Error", "Failed to load users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Create chat room and navigate
  const startChat = async (otherUser: UserItem) => {
    if (!myUserId) {
      Alert.alert("Error", "Please login first");
      return;
    }
    
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
      if (!room.roomId) throw new Error("No roomId returned");
      
      router.push({
        pathname: "/chat",
        params: {
          roomId: room.roomId,
          otherUserId: otherUser.id,
          otherUserName: otherUser.anonymousName,
        },
      });
    } catch (err) {
      console.log("Error starting chat:", err);
      Alert.alert("Error", "Could not start chat. Please try again.");
    } finally {
      setStartingChat(null);
    }
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="people-outline" size={48} color="#C4C4D4" />
      </View>
      <Text style={styles.emptyTitle}>
        {search ? "No users found" : "No other users yet"}
      </Text>
      <Text style={styles.emptySub}>
        {search 
          ? "Try a different search term" 
          : "Check back later for more anonymous users"}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header - Fixed at top with better styling */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.headerBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color="#1C1E21" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search people..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Users List */}
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
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={filteredUsers.length === 0 ? styles.emptyList : styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  
  // Header - Fixed at top
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECEF",
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1E21",
  },
  headerPlaceholder: {
    width: 40,
  },
  
  // Search Bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: "#F2F3F7",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1C1E21",
    padding: 0,
  },
  
  // List
  listContent: {
    paddingBottom: 32,
  },
  emptyList: {
    flex: 1,
  },
  separator: {
    height: 0.5,
    backgroundColor: "#E8ECEF",
    marginLeft: 80,
  },
  
  // User Row
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    gap: 14,
  },
  userRowPressed: {
    backgroundColor: "#F8F9FC",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1E21",
  },
  userStatus: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 48,
    paddingTop: 100,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1E21",
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: "#65676B",
    textAlign: "center",
    lineHeight: 20,
  },
});