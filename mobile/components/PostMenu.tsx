import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type PostMenuProps = {
  visible: boolean;
  onClose: () => void;
  isOwner: boolean;
  isSaved: boolean;
  onSave: () => void;
  onDelete: () => void;
  onNotInterested: () => void;
  onReport: () => void;
  onEdit?: () => void; // ✅ Add this line
};

export default function PostMenu({
  visible,
  onClose,
  isOwner,
  isSaved,
  onSave,
  onDelete,
  onNotInterested,
  onReport,
  onEdit, // ✅ Add this parameter
}: PostMenuProps) {
  const menuItems = [];

  // Save option for everyone
  menuItems.push({
    id: 'save',
    icon: isSaved ? 'bookmark' : 'bookmark-outline',
    label: isSaved ? 'Unsave Post' : 'Save Post',
    color: '#6C63FF',
    onPress: onSave,
    show: true,
  });

  // Edit option (only for owner)
  if (isOwner && onEdit) {
    menuItems.push({
      id: 'edit',
      icon: 'create-outline',
      label: 'Edit Post',
      color: '#3B82F6',
      onPress: onEdit,
      show: true,
    });
  }

  // Not Interested (only for non-owners)
  if (!isOwner) {
    menuItems.push({
      id: 'notInterested',
      icon: 'eye-off-outline',
      label: 'Not Interested',
      color: '#F59E0B',
      onPress: onNotInterested,
      show: true,
    });
  }

  // Report (only for non-owners)
  if (!isOwner) {
    menuItems.push({
      id: 'report',
      icon: 'flag-outline',
      label: 'Report Post',
      color: '#EF4444',
      onPress: onReport,
      show: true,
    });
  }

  // Delete (only for owners)
  if (isOwner) {
    menuItems.push({
      id: 'delete',
      icon: 'trash-outline',
      label: 'Delete Post',
      color: '#EF4444',
      onPress: onDelete,
      show: true,
    });
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.menuContainer}>
          <View style={styles.menuHeader}>
            <View style={styles.menuHandle} />
          </View>
          
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => {
                item.onPress();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={[styles.menuLabel, { color: item.color }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#C4C4D4" />
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  menuHeader: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});