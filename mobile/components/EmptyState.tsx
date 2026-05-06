import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Props = { emoji: string; title: string; subtitle?: string };

export default function EmptyState({ emoji, title, subtitle }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.sub}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40 },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 6 },
  sub: { fontSize: 14, color: "#9999AA", textAlign: "center", lineHeight: 20 },
});