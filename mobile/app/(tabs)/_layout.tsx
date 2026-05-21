import { Tabs, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, StyleSheet, Keyboard, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  const router = useRouter();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true)
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false)
    );

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#000000",
        tabBarInactiveTintColor: "#B0AECF",
        tabBarStyle: keyboardVisible
          ? { display: "none" }
          : {
              height: 64,
              borderTopWidth: 0,
              backgroundColor: "#FFFFFF",
              elevation: 12,
              shadowColor: "#6C63FF",
              shadowOpacity: 0.08,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: -4 },
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
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

      {/* FLOATING CENTER BUTTON - Only show when keyboard is hidden */}
      <Tabs.Screen
        name="add_post"
        options={{
          tabBarButton: () => 
            !keyboardVisible ? (
              <View style={styles.floatingContainer}>
                <TouchableOpacity
                  style={styles.floatingButton}
                  onPress={() => router.push("/add_post")}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={30} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : null,
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
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});