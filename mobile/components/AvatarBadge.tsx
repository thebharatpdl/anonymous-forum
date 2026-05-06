import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Props = { username: string; size?: number };

const PALETTE = ["#FFB3C6","#A8D8EA","#B5EAD7","#FFDAC1","#C7CEEA","#F9C74F"];

function getColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export default function AvatarBadge({ username, size = 50 }: Props) {
  const bg = getColor(username);
  const letter = username?.charAt(0).toUpperCase() || "A";

  return (
    <View style={[
      styles.avatar,
      { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }
    ]}>
      <Text style={[styles.letter, { fontSize: size * 0.38 }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.6)",
  },
  letter: { fontWeight: "800", color: "#fff" },
});