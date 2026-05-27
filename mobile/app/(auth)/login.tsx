import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login, anonymousRegister } from '../../services/authService';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState<'email' | 'anonymous'>('email');

  // ✅ Only animate logo and text, NOT the inputs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please fill in all fields');
      return;
    }
    if (!validateEmail(email.trim())) {
      Alert.alert('Invalid email', 'Please enter a valid email address');
      return;
    }

    console.log('🔵 Login attempt:', email.trim());
    setLoading(true);
    
    try {
      const result = await login(email.trim(), password);
      console.log('🟢 Login success:', result.user?.anonymousName);
      
      const savedToken = await AsyncStorage.getItem('@auth_token');
      console.log('🔑 Token saved:', !!savedToken);

      setTimeout(() => {
        router.replace('/(tabs)');
      }, 200);

    } catch (error: any) {
      console.log('🔴 Login error:', error.response?.status, error.response?.data);
      const message = error.response?.data?.error || 'Invalid email or password';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    setLoading(true);
    try {
      await anonymousRegister();
      setTimeout(() => router.replace('/(tabs)'), 200);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to create anonymous account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ✅ Animated logo and text only */}
            <Animated.View style={{ opacity: fadeAnim }}>
              <Animated.View style={[styles.logoWrapper, { transform: [{ scale: logoScale }] }]}>
                <LinearGradient
                  colors={['#7B6EFA', '#5B5BF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoGradient}
                >
                  <Ionicons name="chatbubble-ellipses" size={40} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>

              <Text style={styles.headline}>Welcome back</Text>
              <Text style={styles.subheadline}>Sign in to continue your conversations</Text>
            </Animated.View>

            {/* ✅ Toggle - NOT animated */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleBtn, loginType === 'email' && styles.toggleBtnActive]}
                onPress={() => setLoginType('email')}
              >
                <Ionicons name="mail" size={16} color={loginType === 'email' ? '#FFFFFF' : '#5B5BF6'} />
                <Text style={[styles.toggleText, loginType === 'email' && styles.toggleTextActive]}>Email</Text>
              </TouchableOpacity>
   
            </View>

            {/* ✅ Form - NOT animated (fixes cursor issue) */}
            {loginType === 'email' ? (
              <View style={styles.formCard}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Email address</Text>
                  <View style={styles.inputRow}>
                    <View style={styles.iconBox}>
                      <Ionicons name="mail" size={18} color="#5B5BF6" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="you@example.com"
                      placeholderTextColor="#ABABC4"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <View style={styles.inputRow}>
                    <View style={styles.iconBox}>
                      <Ionicons name="lock-closed" size={18} color="#5B5BF6" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Your password"
                      placeholderTextColor="#ABABC4"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                    >
                      <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#5B5BF6" />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                  style={styles.ctaOuter}
                >
                  <LinearGradient
                    colors={['#7B6EFA', '#5B5BF6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.ctaGradient, loading && { opacity: 0.7 }]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <View style={styles.ctaContent}>
                        <Ionicons name="log-in" size={20} color="#FFFFFF" />
                        <Text style={styles.ctaText}>Sign in</Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <>
      
              </>
            )}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.signupRow}>
              <Text style={styles.signupText}>
                Don't have an account? <Text style={styles.signupLink}>Create one</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F4FF' },
  blobTopRight: {
    position: 'absolute', top: -60, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: '#DCD9FF', opacity: 0.6,
  },
  blobBottomLeft: {
    position: 'absolute', bottom: -80, left: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: '#E8ECFF', opacity: 0.7,
  },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  logoWrapper: { alignItems: 'center', marginBottom: 28 },
  logoGradient: {
    width: 80, height: 80, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#5B5BF6', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 8,
  },
  headline: { fontSize: 30, fontWeight: '700', color: '#1A1733', textAlign: 'center', marginBottom: 6 },
  subheadline: { fontSize: 15, color: '#7B7A96', textAlign: 'center', marginBottom: 24 },
  toggleContainer: {
    flexDirection: 'row', backgroundColor: '#F0EDFF',
    borderRadius: 14, padding: 4, marginBottom: 24,
  },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12,
  },
  toggleBtnActive: { backgroundColor: '#5B5BF6' },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#5B5BF6' },
  toggleTextActive: { color: '#FFFFFF' },
  formCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: '#ECEAFF',
    shadowColor: '#5B5BF6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 20, elevation: 4,
  },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#3D3B55', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8F7FF', borderRadius: 14, paddingHorizontal: 12,
    height: 52, borderWidth: 1.5, borderColor: '#ECEAFF', gap: 10,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#EEECFF', justifyContent: 'center', alignItems: 'center',
  },
  input: { flex: 1, fontSize: 15, color: '#1A1733' },
  eyeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#EEECFF', justifyContent: 'center', alignItems: 'center',
  },
  ctaOuter: { borderRadius: 14, overflow: 'hidden' },
  ctaGradient: {
    paddingVertical: 16, alignItems: 'center',
    justifyContent: 'center', flexDirection: 'row',
  },
  ctaContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  anonInfoBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#F0EDFF', padding: 16, borderRadius: 14,
    marginBottom: 24, gap: 12,
  },
  anonInfoText: { flex: 1, fontSize: 13, color: '#5B5BF6', lineHeight: 18 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E4E2F5' },
  dividerText: { fontSize: 13, color: '#ABABC4', fontWeight: '500' },
  signupRow: { alignItems: 'center' },
  signupText: { fontSize: 14, color: '#7B7A96' },
  signupLink: { color: '#5B5BF6', fontWeight: '700' },
});