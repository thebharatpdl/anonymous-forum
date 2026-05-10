import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";

// ✅ Redux import
import { Provider } from "react-redux";
import { store } from "../src/redux/store/store"; 

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Provider store={store}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          {/* Tab navigator - main app */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          
          {/* Add Post Modal */}
          <Stack.Screen
            name="add_post"
            options={{ 
              presentation: "modal", 
              headerShown: false  // ← Hide header for add_post
            }}
          />
          
          {/* Post Detail Screen - NO HEADER */}
          <Stack.Screen
            name="post-detail"
            options={{ 
              headerShown: false  // ← Hide header for post detail
            }}
          />
          
          {/* Modal (if you have one) */}
          <Stack.Screen
            name="modal"
            options={{ 
              presentation: "modal", 
              headerShown: false  // ← Hide header for modal
            }}
          />
        </Stack>

        <StatusBar style="auto" />
      </ThemeProvider>
    </Provider>
  );
}