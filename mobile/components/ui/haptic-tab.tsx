// components/ui/haptic-tab.tsx
import React from "react";
import { Pressable } from "react-native";
import * as Haptics from "expo-haptics";

export function HapticTab(props: any) {
  return (
    <Pressable
      {...props}
      onPressIn={(e) => {
        Haptics.selectionAsync(); // 🔥 vibration
        props.onPress?.(e);
      }}
    />
  );
}