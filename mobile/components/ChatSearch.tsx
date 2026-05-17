import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Message = {
  _id?: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  readBy: string[];
  reactions: any[];
};

type ChatSearchProps = {
  visible: boolean;
  onClose: () => void;
  messages: Message[];
  onResultPress: (index: number) => void;
};

export default function ChatSearch({
  visible,
  onClose,
  messages,
  onResultPress,
}: ChatSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ message: Message; index: number }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!visible) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedIndex(0);
    }
  }, [visible]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const results: { message: Message; index: number }[] = [];
    messages.forEach((msg, index) => {
      if (msg.content.toLowerCase().includes(searchQuery.toLowerCase())) {
        results.push({ message: msg, index });
      }
    });
    setSearchResults(results);
    setSelectedIndex(results.length > 0 ? 0 : -1);

    if (results.length > 0) {
      onResultPress(results[0].index);
    }
  };

  const goToNext = () => {
    if (searchResults.length === 0) return;
    const next = (selectedIndex + 1) % searchResults.length;
    setSelectedIndex(next);
    onResultPress(searchResults[next].index);
  };

  const goToPrev = () => {
    if (searchResults.length === 0) return;
    const prev = selectedIndex === 0 ? searchResults.length - 1 : selectedIndex - 1;
    setSelectedIndex(prev);
    onResultPress(searchResults[prev].index);
  };

  const highlightText = (text: string) => {
    if (!searchQuery.trim()) return <Text>{text}</Text>;
    
    const parts = text.split(new RegExp(`(${searchQuery})`, "gi"));
    return (
      <Text>
        {parts.map((part, i) => 
          part.toLowerCase() === searchQuery.toLowerCase() ? (
            <Text key={i} style={styles.highlight}>{part}</Text>
          ) : (
            <Text key={i}>{part}</Text>
          )
        )}
      </Text>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Search Messages</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1C1E21" />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="search-outline" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.input}
              placeholder="Search in conversation..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Button */}
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>

          {/* Results */}
          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                  Found {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                </Text>
                <View style={styles.navButtons}>
                  <TouchableOpacity onPress={goToPrev} style={styles.navButton}>
                    <Ionicons name="chevron-up" size={20} color="#6C63FF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={goToNext} style={styles.navButton}>
                    <Ionicons name="chevron-down" size={20} color="#6C63FF" />
                  </TouchableOpacity>
                </View>
              </View>

              <FlatList
                data={searchResults}
                keyExtractor={(_, i) => i.toString()}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={[styles.resultItem, selectedIndex === index && styles.resultItemActive]}
                    onPress={() => {
                      setSelectedIndex(index);
                      onResultPress(item.index);
                    }}
                  >
                    <Text style={styles.resultSender}>{item.message.senderName}</Text>
                    <Text style={styles.resultContent} numberOfLines={2}>
                      {highlightText(item.message.content)}
                    </Text>
                    <Text style={styles.resultTime}>
                      {new Date(item.message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </TouchableOpacity>
                )}
                style={styles.resultsList}
              />
            </View>
          )}

          {searchQuery.length > 0 && searchResults.length === 0 && (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={48} color="#C4C4D4" />
              <Text style={styles.noResultsText}>No messages found</Text>
              <Text style={styles.noResultsSubtext}>Try different keywords</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    marginTop: 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1E21",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F2F5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1C1E21",
    padding: 0,
  },
  searchButton: {
    backgroundColor: "#6C63FF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E4E6EB",
    marginBottom: 12,
  },
  resultsCount: {
    fontSize: 13,
    color: "#65676B",
  },
  navButtons: {
    flexDirection: "row",
    gap: 12,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  resultItemActive: {
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
  },
  resultSender: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6C63FF",
    marginBottom: 4,
  },
  resultContent: {
    fontSize: 14,
    color: "#1C1E21",
    marginBottom: 4,
  },
  resultTime: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  highlight: {
    backgroundColor: "#FFF3E0",
    color: "#F59E0B",
    fontWeight: "600",
  },
  noResults: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#65676B",
    marginTop: 12,
  },
  noResultsSubtext: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 4,
  },
});