import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Provider } from "react-redux";
import { store } from "../src/redux/store/store";

export default function RootLayout() {
  return (
    <Provider store={store}>
      <Stack>
        {/* Welcome screen - first screen */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        
        {/* Main tabs */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        {/* Modals */}
        <Stack.Screen name="add_post" options={{ presentation: "modal", headerShown: false }} />
        <Stack.Screen name="post-detail" options={{ headerShown: false }} />
        
        {/* Chat screens */}
        <Stack.Screen name="chats" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
     
     <Stack.Screen name="notifications" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </Provider>
  );
}