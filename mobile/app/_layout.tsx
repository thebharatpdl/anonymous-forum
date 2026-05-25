import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Provider } from "react-redux";
import { useEffect } from "react";
import { store } from "../src/redux/store/store";
import { registerForPushNotificationsAsync, sendTokenToBackend, setupNotificationHandlers } from "../services/notificationService";
import { isAuthenticated } from "../services/authService";

export default function RootLayout() {
  useEffect(() => {
    initPushNotifications();
  }, []);

  const initPushNotifications = async () => {
    // Setup handlers
    setupNotificationHandlers();
    
    // Check if user is logged in
    const authenticated = await isAuthenticated();
    if (authenticated) {
      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) {
        await sendTokenToBackend(pushToken);
      }
    }
  };

  return (
    <Provider store={store}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="add_post" options={{ presentation: "modal", headerShown: false }} />
        <Stack.Screen name="post-detail" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen name="chats" options={{ headerShown: false }} />
        <Stack.Screen name="chatlist" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="[id]" options={{ headerShown: false }} />
            <Stack.Screen name="find-people" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </Provider>
  );
}