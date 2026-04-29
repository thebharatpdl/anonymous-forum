import { Tabs, useRouter } from "expo-router";
import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#6C63FF",
        tabBarInactiveTintColor: "#B0AECF",
        tabBarStyle: {
          height: 64,
          borderTopWidth: 0,
          backgroundColor: "#FFFFFF",
          elevation: 12,
          shadowColor: "#6C63FF",
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          position: "absolute",
        },
      }}
    >
      {/* HOME */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />

      {/* FLOATING CENTER BUTTON */}
      <Tabs.Screen
        name="add_post"
        options={{
          tabBarButton: () => (
            <View style={styles.floatingContainer}>
              <TouchableOpacity
                style={styles.floatingButton}
                onPress={() => router.push("/add_post")}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={30} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {/* PROFILE */}
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    top: -22,
    justifyContent: "center",
    alignItems: "center",
  },
  floatingButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#6C63FF",       // indigo/violet
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6C63FF",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});