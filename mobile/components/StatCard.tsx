import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Props = { value: number; label: string };

export default function StatCard({ value, label }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center" },
  value: { fontSize: 22, fontWeight: "800", color: "#fff" },
  label: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2, fontWeight: "500" },
});