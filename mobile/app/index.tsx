import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { isAuthenticated, getCurrentUser } from '../services/authService';

export default function WelcomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Add a small delay to ensure storage is read properly after logout
    const timer = setTimeout(() => {
      checkUser();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const checkUser = async () => {
    const authenticated = await isAuthenticated();
    console.log('Welcome screen - authenticated:', authenticated);
    
    if (authenticated) {
      const user = await getCurrentUser();
      console.log('👋 Welcome back:', user?.anonymousName);
      router.replace('/(tabs)');
    } else {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Ionicons name="chatbubble-ellipses" size={80} color="#6C63FF" />
        </View>
        <Text style={styles.title}>EchoVoice</Text>
        <Text style={styles.subtitle}>Speak freely. Connect anonymously.</Text>

        <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.loginButtonText}>Login / Sign Up</Text>
        </TouchableOpacity>

        <Text style={styles.note}>Use any email • No verification needed</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logoContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '800', color: '#1C1E21', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#65676B', marginBottom: 48, textAlign: 'center' },
  loginButton: { backgroundColor: '#6C63FF', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 30, width: '100%', alignItems: 'center' },
  loginButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  note: { fontSize: 12, color: '#9CA3AF', marginTop: 20, textAlign: 'center' },
});