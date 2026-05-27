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
import { register } from '../../services/authService';

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ✅ Only animate logo - NOT the form
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

  const getPasswordStrength = (pass: string): { label: string; color: string; width: '33%' | '66%' | '100%' } => {
    if (pass.length < 6) return { label: 'Weak', color: '#EF4444', width: '33%' as const };
    if (pass.length < 8) return { label: 'Fair', color: '#F59E0B', width: '66%' as const };
    if (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pass)) return { label: 'Strong', color: '#10B981', width: '100%' as const };
    return { label: 'Fair', color: '#F59E0B', width: '66%' as const };
  };

  const handleRegister = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      Alert.alert('Missing fields', 'Please fill in all fields');
      return;
    }
    if (!validateEmail(email.trim())) {
      Alert.alert('Invalid email', 'Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match');
      return;
    }

    console.log('🔵 Register attempt:', email.trim());
    setLoading(true);
    
    try {
      const result = await register(email.trim(), password);
      console.log('🟢 Register success:', result.user?.anonymousName);
      
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 200);

    } catch (error: any) {
      console.log('🔴 Register error:', error.response?.status, error.response?.data);
      const message = error.response?.data?.error || 'Registration failed';
      Alert.alert('Registration Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = password ? getPasswordStrength(password) : null;

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
                  <Ionicons name="person-add" size={40} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>

              <Text style={styles.headline}>Create Account</Text>
              <Text style={styles.subheadline}>Join with a random anonymous username</Text>
            </Animated.View>

            {/* ✅ Form - NOT animated (stable inputs) */}
            <View style={styles.formCard}>
              {/* Email */}
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
                  {email.length > 0 && (
                    <Ionicons
                      name={validateEmail(email) ? 'checkmark-circle' : 'close-circle'}
                      size={20}
                      color={validateEmail(email) ? '#10B981' : '#EF4444'}
                    />
                  )}
                </View>
              </View>

              {/* Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={styles.inputRow}>
                  <View style={styles.iconBox}>
                    <Ionicons name="lock-closed" size={18} color="#5B5BF6" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Min. 6 characters"
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
                {/* Password strength */}
                {passwordStrength && (
                  <View style={styles.strengthRow}>
                    <View style={styles.strengthBar}>
                      <View style={[styles.strengthFill, { width: passwordStrength.width, backgroundColor: passwordStrength.color }]} />
                    </View>
                    <Text style={[styles.strengthText, { color: passwordStrength.color }]}>{passwordStrength.label}</Text>
                  </View>
                )}
              </View>

              {/* Confirm Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Confirm Password</Text>
                <View style={styles.inputRow}>
                  <View style={styles.iconBox}>
                    <Ionicons name="lock-closed" size={18} color="#5B5BF6" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter password"
                    placeholderTextColor="#ABABC4"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#5B5BF6" />
                  </TouchableOpacity>
                </View>
                {/* Match indicator */}
                {confirmPassword.length > 0 && (
                  <View style={styles.matchRow}>
                    <Ionicons
                      name={password === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                      size={16}
                      color={password === confirmPassword ? '#10B981' : '#EF4444'}
                    />
                    <Text style={[styles.matchText, { color: password === confirmPassword ? '#10B981' : '#EF4444' }]}>
                      {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Register Button */}
              <TouchableOpacity
                onPress={handleRegister}
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
                      <Ionicons name="person-add" size={20} color="#FFFFFF" />
                      <Text style={styles.ctaText}>Create Account</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Login link */}
            <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.loginRow}>
              <Text style={styles.loginText}>
                Already have an account? <Text style={styles.loginLink}>Sign in</Text>
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
  
  // Logo
  logoWrapper: { alignItems: 'center', marginBottom: 28 },
  logoGradient: {
    width: 80, height: 80, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#5B5BF6', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 8,
  },
  
  // Headlines
  headline: { fontSize: 30, fontWeight: '700', color: '#1A1733', textAlign: 'center', marginBottom: 6 },
  subheadline: { fontSize: 15, color: '#7B7A96', textAlign: 'center', marginBottom: 28 },
  
  // Form
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
  
  // Password strength
  strengthRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  strengthBar: { flex: 1, height: 4, backgroundColor: '#E4E6EB', borderRadius: 2 },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthText: { fontSize: 12, fontWeight: '600', width: 45 },
  
  // Match indicator
  matchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  matchText: { fontSize: 12, fontWeight: '500' },
  
  // CTA
  ctaOuter: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  ctaGradient: {
    paddingVertical: 16, alignItems: 'center',
    justifyContent: 'center', flexDirection: 'row',
  },
  ctaContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  
  // Login link
  loginRow: { alignItems: 'center', marginTop: 24 },
  loginText: { fontSize: 14, color: '#7B7A96' },
  loginLink: { color: '#5B5BF6', fontWeight: '700' },
});