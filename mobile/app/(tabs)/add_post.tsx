import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
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

// Avatar color from name
const AVATAR_COLORS = [
  "#6C63FF", "#F43F5E", "#10B981", "#F59E0B",
  "#3B82F6", "#EC4899", "#14B8A6", "#8B5CF6",
];
function getAvatarColor(name: string) {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

export default function CreatePostScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [userName, setUserName] = useState('Anonymous');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const remainingChars = MAX_CHARS - content.length;
  const isDisabled = content.trim().length === 0 || loading;
  const progress = content.length / MAX_CHARS;
  const avatarColor = getAvatarColor(userName);
  const avatarLetter = (userName || 'A')[0].toUpperCase();

  useEffect(() => {
    getCurrentUser().then((u) => { if (u) setUserName(u.anonymousName); });
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 11, useNativeDriver: true }),
    ]).start();
  }, []);

  // Animate progress ring
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress, duration: 150, useNativeDriver: false,
    }).start();
  }, [progress]);

  const createPost = async () => {
    if (isDisabled) return;
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) { Alert.alert('Error', 'Please login first'); router.replace('/'); return; }
      const response = await axios.post(
        `${API_URL}`,
        { content: content.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      dispatch(addPost(response.data));
      Alert.alert('Posted!', 'Your anonymous thought is live.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      setContent('');
    } catch (error: any) {
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

  // Progress ring color
  const ringColor = progressAnim.interpolate({
    inputRange: [0, 0.7, 0.9, 1],
    outputRange: ['#6C63FF', '#6C63FF', '#F59E0B', '#F43F5E'],
  });

  // Char count color
  const charColor = remainingChars <= 0
    ? '#F43F5E'
    : remainingChars <= 30
    ? '#F59E0B'
    : '#9CA3AF';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleCancel} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color="#374151" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>New Post</Text>

          <TouchableOpacity
            style={[styles.postBtn, isDisabled && styles.postBtnDisabled]}
            onPress={createPost}
            disabled={isDisabled}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="send" size={14} color="#FFF" />
                <Text style={styles.postBtnText}>Post</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Composer Card ── */}
        <Animated.View
          style={[
            styles.card,
            isFocused && styles.cardFocused,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Author Row */}
          <View style={styles.authorRow}>
            <View style={[styles.avatar, { backgroundColor: avatarColor + '18', borderColor: avatarColor + '40' }]}>
              <Text style={[styles.avatarText, { color: avatarColor }]}>{avatarLetter}</Text>
            </View>
            <View>
              <Text style={[styles.authorName, { color: avatarColor }]}>{userName}</Text>
              <View style={styles.anonBadge}>
                <Ionicons name="shield-checkmark" size={10} color="#10B981" />
                <Text style={styles.anonBadgeText}>Anonymous</Text>
              </View>
            </View>
          </View>

          {/* Text Input */}
          <TextInput
            placeholder="What's on your mind? Share anonymously…"
            placeholderTextColor="#C4C4D4"
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

          {/* Divider */}
          <View style={styles.divider} />

          {/* Footer */}
          <View style={styles.footer}>
            {/* Tips */}
            <View style={styles.tipRow}>
              <Ionicons name="lock-closed-outline" size={13} color="#9CA3AF" />
              <Text style={styles.tipText}>Your identity stays hidden</Text>
            </View>

            {/* Char counter */}
            <View style={styles.counterRow}>
              {/* Progress ring (simple circle) */}
              <View style={styles.progressRingWrap}>
                <View style={[styles.progressRingBg, { borderColor: '#F0F0F8' }]} />
                <Animated.View
                  style={[
                    styles.progressRingFill,
                    {
                      borderColor: ringColor,
                      opacity: content.length > 0 ? 1 : 0,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.charCount, { color: charColor }]}>
                {remainingChars}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Tips Card ── */}
        <Animated.View style={[styles.tipsCard, { opacity: fadeAnim }]}>
          <View style={styles.tipsRow}>
            {[
              { icon: "eye-off-outline", text: "Identity hidden" },
              { icon: "globe-outline", text: "Shared globally" },
              { icon: "heart-outline", text: "Get reactions" },
            ].map((tip) => (
              <View key={tip.text} style={styles.tipItem}>
                <View style={styles.tipIconWrap}>
                  <Ionicons name={tip.icon as any} size={16} color="#6C63FF" />
                </View>
                <Text style={styles.tipItemText}>{tip.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7FC' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#F7F7FC',
    borderBottomWidth: 1, borderBottomColor: '#EBEBF5',
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#EBEBF5',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  postBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#6C63FF',
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  postBtnDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0 },
  postBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24, margin: 16, padding: 18,
    borderWidth: 1, borderColor: '#F0F0F8',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 16, elevation: 3,
  },
  cardFocused: { borderColor: '#6C63FF' },

  // Author
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  avatarText: { fontSize: 17, fontWeight: '800' },
  authorName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  anonBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F0FDF4', borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0',
    paddingHorizontal: 6, paddingVertical: 2,
  },
  anonBadgeText: { fontSize: 10, fontWeight: '600', color: '#10B981' },

  // Input
  input: {
    fontSize: 16, color: '#111827', lineHeight: 24,
    textAlignVertical: 'top', minHeight: 120, maxHeight: 220,
  },

  divider: { height: 1, backgroundColor: '#F5F5FA', marginVertical: 14 },

  // Footer
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tipText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressRingWrap: { width: 22, height: 22, position: 'relative' },
  progressRingBg: {
    position: 'absolute', width: 22, height: 22, borderRadius: 11,
    borderWidth: 2.5,
  },
  progressRingFill: {
    position: 'absolute', width: 22, height: 22, borderRadius: 11,
    borderWidth: 2.5, borderTopColor: 'transparent', borderRightColor: 'transparent',
  },
  charCount: { fontSize: 13, fontWeight: '700', minWidth: 28, textAlign: 'right' },

  // Tips Card
  tipsCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20,
    marginHorizontal: 16, marginTop: 4, padding: 16,
    borderWidth: 1, borderColor: '#F0F0F8',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  tipsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  tipItem: { alignItems: 'center', gap: 6 },
  tipIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  tipItemText: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textAlign: 'center' },
});