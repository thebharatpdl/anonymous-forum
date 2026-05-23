import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import { getToken } from './authService';

const API_URL = 'http://192.168.1.69:5000/api';

// Store listeners for cleanup
let notificationReceivedListener: Notifications.Subscription | null = null;
let notificationResponseListener: Notifications.Subscription | null = null;

// Configure how notifications appear when app is open - FIXED with all required properties
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Register for push notifications
export async function registerForPushNotificationsAsync() {
  let token;

  // Physical device check
  if (!Device.isDevice) {
    Alert.alert('Must use physical device for Push Notifications');
    return null;
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Alert.alert('Failed to get push token permission!');
    return null;
  }

  // Get Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    if (!projectId) {
      console.log('No project ID found. Push notifications will use dummy token');
      return 'dummy-token-for-development';
    }
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('📱 Push token:', token.substring(0, 20) + '...');
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63FF',
    });
  }

  return token;
}

// Send token to backend
export async function sendTokenToBackend(pushToken: string) {
  try {
    const authToken = await getToken();
    if (!authToken) {
      console.log('No auth token');
      return;
    }

    const response = await fetch(`${API_URL}/auth/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ pushToken }),
    });

    if (response.ok) {
      console.log('✅ Push token saved to backend');
    } else {
      console.log('❌ Failed to save push token');
    }
  } catch (error) {
    console.error('Error sending token to backend:', error);
  }
}

// Remove token on logout
export async function removeTokenFromBackend(pushToken: string) {
  try {
    const authToken = await getToken();
    if (!authToken) return;

    await fetch(`${API_URL}/auth/push-token/remove`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ pushToken }),
    });

    console.log('✅ Push token removed');
  } catch (error) {
    console.error('Error removing push token:', error);
  }
}

// Handle notification tap (deep linking)
export function setupNotificationHandlers() {
  // Clean up existing listeners
  cleanupNotificationHandlers();
  
  // When notification is received while app is open
  notificationReceivedListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('📱 Notification received while app open:', notification);
  });

  // When user taps on notification
  notificationResponseListener = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    console.log('🔘 Notification tapped:', data);
    
    // Handle navigation based on notification type
    if (data.type === 'post' && data.postId) {
      console.log('Navigate to post:', data.postId);
    } else if (data.type === 'chat' && data.roomId) {
      console.log('Navigate to chat:', data.roomId);
    } else if (data.type === 'profile' && data.userId) {
      console.log('Navigate to profile:', data.userId);
    }
  });
}

// Cleanup notification handlers - FIXED: use correct method
// Alternative cleanup method (if removeNotificationSubscription doesn't exist)
export function cleanupNotificationHandlers() {
  if (notificationReceivedListener) {
    notificationReceivedListener.remove();
    notificationReceivedListener = null;
  }
  if (notificationResponseListener) {
    notificationResponseListener.remove();
    notificationResponseListener = null;
  }
}