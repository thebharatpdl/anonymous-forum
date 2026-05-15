import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { anonymousRegister, isAuthenticated, getCurrentUser } from '../services/authService';

export default function WelcomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const hasAccount = await isAuthenticated();
    if (hasAccount) {
      const user = await getCurrentUser();
      console.log('👋 Welcome back:', user?.anonymousName);
      router.replace('/(tabs)');
    } else {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      await anonymousRegister();
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error:', error);
    } finally {
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
        
        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>Start Chatting</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.note}>
          No email or password needed • One tap and you're in
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1C1E21',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#65676B',
    marginBottom: 48,
    textAlign: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6C63FF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    marginBottom: 20,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});