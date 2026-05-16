import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
  StyleSheet,
} from "react-native";

export const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

type Props = {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  isMyMessage: boolean;
  bubbleY: number;
};

export default function ReactionPicker({
  visible,
  onSelect,
  onClose,
  isMyMessage,
  bubbleY,
}: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Individual emoji scales for staggered pop-in
  const emojiScales = useRef(
    REACTION_EMOJIS.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (visible) {
      // Container appears
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 15,
          stiffness: 250,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();

      // Emojis stagger in
      emojiScales.forEach((s, i) => {
        Animated.spring(s, {
          toValue: 1,
          useNativeDriver: true,
          delay: i * 35,
          damping: 12,
          stiffness: 220,
        }).start();
      });
    } else {
      scale.setValue(0);
      opacity.setValue(0);
      emojiScales.forEach((s) => s.setValue(0));
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity,
              transform: [{ scale }],
              top: bubbleY - 68,
              alignSelf: isMyMessage ? "flex-end" : "flex-start",
              marginRight: isMyMessage ? 12 : 0,
              marginLeft: isMyMessage ? 0 : 50,
            },
          ]}
        >
          {REACTION_EMOJIS.map((emoji, i) => (
            <Animated.View
              key={emoji}
              style={{ transform: [{ scale: emojiScales[i] }] }}
            >
              <TouchableOpacity
                style={styles.emojiBtn}
                onPress={() => {
                  onSelect(emoji);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  container: {
    position: "absolute",
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  emojiBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: { fontSize: 28 },
});