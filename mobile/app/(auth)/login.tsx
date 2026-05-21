import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { login } from '../../services/authService';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Ionicons name="chatbubble-ellipses" size={60} color="#6C63FF" />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Login to continue</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#999" />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#999" />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor="#999"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>Login</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.registerLink}>
            <Text style={styles.registerText}>
              Don't have an account? <Text style={styles.registerLinkText}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  keyboardView: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#1C1E21', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E4E6EB' },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, marginLeft: 12 },
  loginButton: { backgroundColor: '#6C63FF', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  registerLink: { alignItems: 'center', marginTop: 16 },
  registerText: { fontSize: 14, color: '#666' },
  registerLinkText: { color: '#6C63FF', fontWeight: '600' },
});