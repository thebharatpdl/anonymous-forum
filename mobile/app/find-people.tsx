import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Animated,
  Dimensions,
  Vibration,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getCurrentUser, getUserId } from "../services/authService";

const { width } = Dimensions.get("window");
const API_URL = "http://192.168.1.69:5000/api";

type UserItem = {
  id: string;
  anonymousName: string;
  avatarColor: string;
};

// Extended color palette
const AVATAR_COLORS = [
  { bg: "#EEF2FF", text: "#6C63FF", gradient: ["#6C63FF", "#5856D6"] },
  { bg: "#FEF3C7", text: "#D97706", gradient: ["#F59E0B", "#D97706"] },
  { bg: "#DCFCE7", text: "#16A34A", gradient: ["#10B981", "#059669"] },
  { bg: "#FCE7F3", text: "#DB2777", gradient: ["#EC4899", "#BE185D"] },
  { bg: "#E0F2FE", text: "#0284C7", gradient: ["#0EA5E9", "#0369A1"] },
  { bg: "#F3E8FF", text: "#9333EA", gradient: ["#A855F7", "#7E22CE"] },
  { bg: "#FFE4E1", text: "#E11D48", gradient: ["#F43F5E", "#BE123C"] },
  { bg: "#CCFBF1", text: "#0D9488", gradient: ["#14B8A6", "#0F766E"] },
];

function getInitials(name?: string): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

// Animated User Card Component
const AnimatedUserCard = ({ 
  item, 
  index, 
  onPress, 
  isLoading 
}: { 
  item: UserItem; 
  index: number; 
  onPress: () => void; 
  isLoading: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const colors = AVATAR_COLORS[index % AVATAR_COLORS.length];

  return (
    <Animated.View
      style={[
        styles.userCardWrapper,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }, { translateY }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.userCard}
        onPress={onPress}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        <View style={[styles.avatarContainer, { backgroundColor: colors.bg }]}>
          <Text style={[styles.avatarText, { color: colors.text }]}>
            {getInitials(item.anonymousName)}
          </Text>
          <View style={styles.onlineDot} />
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.anonymousName}
          </Text>
          <View style={styles.userBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#10B981" />
            <Text style={styles.userStatus}>Anonymous user</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : (
          <View style={[styles.chatButton, { backgroundColor: colors.bg }]}>
            <Ionicons name="chatbubble-ellipses" size={20} color={colors.text} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Skeleton Loader Component
const SkeletonLoader = () => {
  return (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonContent}>
            <View style={styles.skeletonName} />
            <View style={styles.skeletonStatus} />
          </View>
          <View style={styles.skeletonButton} />
        </View>
      ))}
    </View>
  );
};

export default function FindPeopleScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState("");
  const [myUserName, setMyUserName] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);

  const searchAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredUsers(users);
      setShowSuggestions(true);
    } else {
      setFilteredUsers(
        users.filter((u) =>
          u.anonymousName.toLowerCase().includes(search.toLowerCase())
        )
      );
      setShowSuggestions(false);
    }
  }, [search, users]);

  // Animate search bar on focus
  const handleSearchFocus = () => {
    Animated.spring(searchAnim, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleSearchBlur = () => {
    if (!search) {
      Animated.spring(searchAnim, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  };

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
    if (!myUserId) { 
      Alert.alert("Error", "Please login first"); 
      return; 
    }
    setStartingChat(otherUser.id);
    Vibration.vibrate(30); // Haptic feedback
    
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

  const getRandomSuggestions = () => {
    const shuffled = [...users];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 5);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1C1E21" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Find People</Text>
          <View style={{ width: 40 }} />
        </View>
        <SkeletonLoader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1C1E21" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Discover</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadUsers}>
          <Ionicons name="refresh-outline" size={22} color="#6C63FF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <Animated.View style={[
        styles.searchWrapper,
        {
          transform: [{
            scale: searchAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.02],
            })
          }]
        }
      ]}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username..."
            placeholderTextColor="#C6C6C8"
            value={search}
            onChangeText={setSearch}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Stats Bar */}
      {!search && users.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={16} color="#6C63FF" />
            <Text style={styles.statText}>{users.length} members</Text>
          </View>
        
        </View>
      )}

      {/* Suggestions Section */}
      {!search && showSuggestions && users.length > 0 && (
        <View style={styles.suggestionsHeader}>
          <Text style={styles.suggestionsTitle}>Suggestions for you</Text>
          <TouchableOpacity onPress={loadUsers}>
            <Text style={styles.refreshSuggestions}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* User List */}
      <FlatList
        data={search ? filteredUsers : getRandomSuggestions()}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <AnimatedUserCard
            item={item}
            index={index}
            onPress={() => startChat(item)}
            isLoading={startingChat === item.id}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="people-outline" size={64} color="#C6C6C8" />
            </View>
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptySubtitle}>
              {search ? "Try a different username" : "Check back later for new people"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F2F2F7" 
  },
  
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F2F2F7",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1C1E21",
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Search
  searchWrapper: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1C1E21",
  },
  
  // Stats
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: "#6C63FF",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E5E5EA",
  },
  
  // Suggestions
  suggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  suggestionsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8E8E93",
  },
  refreshSuggestions: {
    fontSize: 13,
    color: "#6C63FF",
    fontWeight: "500",
  },
  
  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  userCardWrapper: {
    marginBottom: 12,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "700",
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#34C759",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1C1E21",
    marginBottom: 4,
  },
  userBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  userStatus: {
    fontSize: 12,
    color: "#8E8E93",
  },
  chatButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  
  // Skeleton
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  skeletonCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    gap: 14,
  },
  skeletonAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E5E5EA",
  },
  skeletonContent: {
    flex: 1,
    gap: 8,
  },
  skeletonName: {
    width: "60%",
    height: 16,
    backgroundColor: "#E5E5EA",
    borderRadius: 8,
  },
  skeletonStatus: {
    width: "40%",
    height: 12,
    backgroundColor: "#E5E5EA",
    borderRadius: 6,
  },
  skeletonButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E5E5EA",
  },
  
  // Empty state
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1E21",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
  },
});