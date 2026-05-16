import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

type Reaction = {
  emoji: string;
  userId: string;
};

type Grouped = {
  emoji: string;
  count: number;
  hasMe: boolean;
};

function groupReactions(reactions: Reaction[], myUserId: string): Grouped[] {
  const map: Record<string, { count: number; hasMe: boolean }> = {};
  for (const r of reactions) {
    if (!map[r.emoji]) map[r.emoji] = { count: 0, hasMe: false };
    map[r.emoji].count++;
    if (r.userId === myUserId) map[r.emoji].hasMe = true;
  }
  return Object.entries(map).map(([emoji, { count, hasMe }]) => ({
    emoji,
    count,
    hasMe,
  }));
}

type Props = {
  reactions: Reaction[];
  myUserId: string;
  onReact: (emoji: string) => void;
  isMyMessage: boolean;
};

export default function ReactionBar({ reactions, myUserId, onReact, isMyMessage }: Props) {
  const grouped = groupReactions(reactions, myUserId);
  
  if (grouped.length === 0) return null;

  return (
    <View
      style={[
        styles.wrapper,
        isMyMessage ? styles.wrapperRight : styles.wrapperLeft,
      ]}
    >
      {grouped.map(({ emoji, count, hasMe }) => (
        <TouchableOpacity
          key={emoji}
          style={styles.chip}
          onPress={() => onReact(emoji)}
          activeOpacity={0.7}
        >
          <Text style={styles.chipEmoji}>{emoji}</Text>
          {count > 1 && (
            <Text style={[styles.chipCount, hasMe && styles.chipCountActive]}>
              {count}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2,
    marginBottom: 0,
  },
  wrapperRight: {
    alignSelf: "flex-end",
    marginRight: 4,
  },
  wrapperLeft: {
    alignSelf: "flex-start",
    marginLeft: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
    backgroundColor: "transparent",
    paddingHorizontal: 2,
    paddingVertical: 0,
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipCount: {
    fontSize: 11,
    color: "#65676B",
    fontWeight: "500",
  },
  chipCountActive: {
    color: "#6C63FF",
  },
});