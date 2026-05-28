import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Keyboard,
  Animated,
} from 'react-native';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdate: (updatedUser: any) => void;
}

export default function EditProfileModal({ visible, onClose, onUpdate }: EditProfileModalProps) {
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      loadUserData();
    }
  }, [visible]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      Animated.spring(slideAnim, {
        toValue: -e.endCoordinates.height + 50,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }).start();
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [slideAnim]);

  const loadUserData = async () => {
    try {
      const { getCurrentUser } = await import('../services/authService');
      const user = await getCurrentUser();
      setBio(user?.bio || '');
    } catch (error) {
      console.log('Error loading user:', error);
    }
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    setLoading(true);
    try {
      const { updateUserProfile } = await import('../services/authService');
      const updatedUser = await updateUserProfile({ bio: bio.trim() });
      onUpdate(updatedUser);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to update bio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <Animated.View style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }]}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
             
              <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#6C63FF" size="small" />
                ) : (
                  <Text style={styles.saveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Bio Input */}
            <TextInput
              style={styles.bioInput}
              placeholder="Tell something about yourself..."
              placeholderTextColor="#9CA3AF"
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={150}
              textAlignVertical="top"
              autoFocus
            />
            <Text style={styles.charCount}>{bio.length}/150</Text>

            {/* Spacer */}
            <View style={{ height: 52, marginTop: 16 }} />
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
  },

  // ✅ Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  saveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  saveText: {
    fontSize: 16,
    color: '#6C63FF',
    fontWeight: '600',
  },

  // ✅ Bio Input
  bioInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 130,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 6,
  },
});