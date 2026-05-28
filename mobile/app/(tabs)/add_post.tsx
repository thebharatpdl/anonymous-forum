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
  Dimensions,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppDispatch } from '../../src/redux/hooks';
import { addPost } from '../../src/redux/postsSlice';
import { getToken, getCurrentUser } from '../../services/authService';
import axios from 'axios';
import { API_URL } from '../../src/config';

const { width } = Dimensions.get('window');
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const charBounceAnim = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<any>(null);

  const remainingChars = MAX_CHARS - content.length;
  const isDisabled = content.trim().length === 0 || loading;
  const progress = content.length / MAX_CHARS;
  const avatarColor = getAvatarColor(userName);
  const avatarLetter = (userName || 'A')[0].toUpperCase();

  useEffect(() => {
    getCurrentUser().then((u) => { if (u) setUserName(u.anonymousName); });
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  // Track keyboard height to avoid covering input
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      const h = e.endCoordinates.height;
      setKeyboardHeight(h);
      setKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
      setKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Animate char counter when approaching limit
  useEffect(() => {
    if (remainingChars <= 30 && remainingChars > 0) {
      Animated.sequence([
        Animated.spring(charBounceAnim, { toValue: 1.2, tension: 200, friction: 3, useNativeDriver: true }),
        Animated.spring(charBounceAnim, { toValue: 1, tension: 200, friction: 3, useNativeDriver: true }),
      ]).start();
    }
  }, [remainingChars]);

  const createPost = async () => {
    if (isDisabled) return;
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) { Alert.alert('Error', 'Please login first'); router.replace('/'); return; }
      const response = await axios.post(
  `${API_URL}/posts`,  // ← add /posts
  { content: content.trim() },
  { headers: { Authorization: `Bearer ${token}` } }
);
      dispatch(addPost(response.data));
      Alert.alert('✨ Posted!', 'Your anonymous thought is now live.', [
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
      Alert.alert('Discard post?', 'Your text will be lost if you leave.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  // Get progress color
  const getProgressColor = () => {
    if (remainingChars <= 0) return '#F43F5E';
    if (remainingChars <= 30) return '#F59E0B';
    return '#6C63FF';
  };

  // Char count color
  const getCharColor = () => {
    if (remainingChars <= 0) return '#F43F5E';
    if (remainingChars <= 30) return '#F59E0B';
    return '#9CA3AF';
  };

  // Get warning text
  const getWarningText = () => {
    if (remainingChars <= 0) return 'Character limit reached';
    if (remainingChars <= 10) return 'Almost at limit!';
    if (remainingChars <= 30) return 'Getting close to limit';
    return '';
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeBtn} 
          onPress={handleCancel} 
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#374151" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Create Post</Text>

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
              <Text style={styles.postBtnText}>Post</Text>
              <Ionicons name="send" size={14} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Main Content ── */}
      <Animated.ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          keyboardVisible && { paddingBottom: keyboardHeight + 20 }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Author Card */}
        <Animated.View
          style={[
            styles.authorCard,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.authorRow}>
            <View style={[styles.avatar, { backgroundColor: avatarColor + '15' }]}>
              <Text style={[styles.avatarText, { color: avatarColor }]}>{avatarLetter}</Text>
            </View>
            <View style={styles.authorInfo}>
              <Text style={[styles.authorName, { color: avatarColor }]}>{userName}</Text>
              <View style={styles.anonBadge}>
                <View style={styles.anonDot} />
                <Text style={styles.anonBadgeText}>Anonymous Post</Text>
              </View>
            </View>
          </View>
        </Animated.View>

          {/* Composer Card */}
          <Animated.View
            style={[
              styles.composerCard,
              isFocused && styles.composerCardFocused,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TextInput
              placeholder="What's on your mind?"
              placeholderTextColor="#C6C6C8"
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

            {/* Warning message */}
            {getWarningText() !== '' && (
              <Animated.View style={[styles.warningContainer, { opacity: fadeAnim }]}>
                <Ionicons 
                  name={remainingChars <= 0 ? "alert-circle" : "information-circle"} 
                  size={16} 
                  color={getCharColor()} 
                />
                <Text style={[styles.warningText, { color: getCharColor() }]}>
                  {getWarningText()}
                </Text>
              </Animated.View>
            )}
          </Animated.View>

          {/* Footer Stats Card */}
          <Animated.View style={[styles.statsCard, { opacity: fadeAnim }]}>
            <View style={styles.statsRow}>
              {/* Character counter */}
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: getProgressColor() + '10' }]}>
                  <Ionicons name="text-outline" size={18} color={getProgressColor()} />
                </View>
                <View style={styles.statInfo}>
                  <Animated.Text 
                    style={[
                      styles.statValue, 
                      { color: getCharColor(), transform: [{ scale: charBounceAnim }] }
                    ]}
                  >
                    {remainingChars}
                  </Animated.Text>
                  <Text style={styles.statLabel}>characters left</Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                  <Animated.View 
                    style={[
                      styles.progressBarFill,
                      { 
                        width: `${progress * 100}%`,
                        backgroundColor: getProgressColor(),
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>
          </Animated.View>

        {/* Tips Section */}
        <Animated.View style={[styles.tipsSection, { opacity: fadeAnim }]}>
          <View style={styles.tipsHeader}>
            <Text style={styles.tipsTitle}>A little inspiration for you...</Text>
          </View>
          
          <View style={styles.tipsGrid}>
            <View style={styles.tipCard}>
              <View style={styles.tipIconWrap}>
                <Ionicons name="eye-off-outline" size={24} color="#6C63FF" />
              </View>
              <Text style={styles.tipTitle}>You're invisible here </Text>
              <Text style={styles.tipDesc}>No one knows it's you — speak freely!</Text>
            </View>

            <View style={styles.tipCard}>
              <View style={styles.tipIconWrap}>
                <Ionicons name="heart-outline" size={24} color="#F43F5E" />
              </View>
              <Text style={styles.tipTitle}>Just be yourself </Text>
              <Text style={styles.tipDesc}>The realest posts get the most love</Text>
            </View>

            <View style={styles.tipCard}>
              <View style={styles.tipIconWrap}>
                <Ionicons name="chatbubbles-outline" size={24} color="#10B981" />
              </View>
              <Text style={styles.tipTitle}>Don't be a stranger 💬</Text>
              <Text style={styles.tipDesc}>Reply to comments — make friends!</Text>
            </View>
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: '#F2F2F7' 
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E5EA',
  },
  closeBtn: {
    width: 40, 
    height: 40, 
    borderRadius: 20,
    backgroundColor: '#FFFFFF', 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1C1E21' 
  },
  postBtn: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6,
    backgroundColor: '#6C63FF',
    paddingHorizontal: 18, 
    paddingVertical: 10, 
    borderRadius: 22,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, 
    shadowRadius: 8, 
    elevation: 4,
  },
  postBtnDisabled: { 
    backgroundColor: '#D1D5DB', 
    shadowOpacity: 0 
  },
  postBtnText: { 
    color: '#FFF', 
    fontWeight: '700', 
    fontSize: 14 
  },

  // Author Card
  authorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginBottom: 16,
},
tipsEmoji: {
  fontSize: 24,
},
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  anonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  anonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  anonBadgeText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },

  // Composer Card
  composerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  composerCardFocused: {
    borderColor: '#6C63FF',
    borderWidth: 2,
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  input: {
    fontSize: 17,
    color: '#1C1E21',
    lineHeight: 24,
    textAlignVertical: 'top',
    minHeight: 120,
    maxHeight: 200,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  warningText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Stats Card
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  statsRow: {
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#6C63FF',
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },

  // Tips Section
  tipsSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1E21',
    marginBottom: 12,
  },
  tipsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  tipCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  tipIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1E21',
    marginBottom: 4,
    textAlign: 'center',
  },
  tipDesc: {
    fontSize: 10,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 14,
  },

  // Quote Card
  quoteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  quoteText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 8,
  },
  quoteAuthor: {
    fontSize: 12,
    color: '#C6C6C8',
    fontWeight: '500',
  },
});