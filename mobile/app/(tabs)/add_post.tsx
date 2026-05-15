import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppDispatch } from '../../src/redux/hooks';
import { addPost } from '../../src/redux/postsSlice';
import { getToken, getCurrentUser } from '../../services/authService';
import axios from 'axios';
import { API_URL } from '../../src/config';

const MAX_CHARS = 280;

export default function CreatePostScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const remainingChars = MAX_CHARS - content.length;
  const isDisabled = content.trim().length === 0 || loading;

  const createPost = async () => {
    if (isDisabled) return;

    try {
      setLoading(true);
      
      // Get auth token
      const token = await getToken();
      const user = await getCurrentUser();
      
      if (!token) {
        Alert.alert('Error', 'Please login first');
        router.replace('/');
        return;
      }

      // Send request with auth header
      const response = await axios.post(
        `${API_URL}`,
        { content: content.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Dispatch to Redux
      dispatch(addPost(response.data));
      
      Alert.alert('Success', 'Post created!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      
      setContent('');
    } catch (error: any) {
      console.error('Create post error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (content.length > 0) {
      Alert.alert('Discard post?', 'Your text will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Ionicons name="close-outline" size={28} color="#666" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Post</Text>
          <TouchableOpacity
            onPress={createPost}
            disabled={isDisabled}
            style={[styles.postButton, isDisabled && styles.postButtonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, isFocused && styles.cardFocused]}>
          <TextInput
            placeholder="What's on your mind? Share anonymously..."
            placeholderTextColor="#B0B0C0"
            value={content}
            onChangeText={setContent}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            multiline
            style={styles.input}
            maxLength={MAX_CHARS}
            editable={!loading}
            autoFocus
          />

          <View style={styles.footerRow}>
            <Text style={[styles.counter, remainingChars < 20 && styles.counterWarning]}>
              {remainingChars} characters left
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFF4',
  },
  cancelButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1E21',
  },
  postButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postButtonDisabled: {
    backgroundColor: '#C4C4D4',
  },
  postButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    margin: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  cardFocused: {
    borderColor: '#6C63FF',
  },
  input: {
    fontSize: 16,
    color: '#1C1E21',
    textAlignVertical: 'top',
    minHeight: 120,
    maxHeight: 200,
  },
  footerRow: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  counter: {
    fontSize: 12,
    color: '#999',
  },
  counterWarning: {
    color: '#FF4D6D',
  },
});