import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ChatMenuProps = {
  visible: boolean;
  onClose: () => void;
  onSearch: () => void;
  onBlock: () => void;
  onDelete: () => void;
};

export default function ChatMenu({
  visible,
  onClose,
  onSearch,
  onBlock,
  onDelete,
}: ChatMenuProps) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={onSearch}>
            <Ionicons name="search-outline" size={22} color="#1C1E21" />
            <Text style={styles.menuText}>Search Chat</Text>
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.menuItem} onPress={onBlock}>
            <Ionicons name="ban-outline" size={22} color="#E5484D" />
            <Text style={[styles.menuText, { color: "#E5484D" }]}>Block User</Text>
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.menuItem} onPress={onDelete}>
            <Ionicons name="trash-outline" size={22} color="#E5484D" />
            <Text style={[styles.menuText, { color: "#E5484D" }]}>Delete Chat</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: 250,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuText: {
    fontSize: 16,
    color: "#1C1E21",
  },
  divider: {
    height: 1,
    backgroundColor: "#E4E6EB",
    marginHorizontal: 12,
  },
});