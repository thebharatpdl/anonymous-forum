// import React from "react";
// import {
//   TouchableOpacity,
//   Text,
//   StyleSheet,
//   ViewStyle,
//   ActivityIndicator,
// } from "react-native";

// type IconButtonProps = {
//   icon: string;
//   label?: string;
//   count?: number;
//   onPress: () => void;
//   disabled?: boolean;
//   loading?: boolean;
//   active?: boolean;
//   style?: ViewStyle;
// };

// export default function IconButton({
//   icon,
//   label,
//   count,
//   onPress,
//   disabled = false,
//   loading = false,
//   active = false,
//   style,
// }: IconButtonProps) {
//   return (
//     <TouchableOpacity
//       style={[styles.button, active && styles.activeButton, style]}
//       onPress={onPress}
//       disabled={disabled || loading}
//       activeOpacity={0.7}
//     >
//       {loading ? (
//         <ActivityIndicator size="small" color="#FF4D6D" style={styles.loader} />
//       ) : (
//         <Text style={styles.icon}>{icon}</Text>
//       )}
//       {label && (
//         <Text style={[styles.label, active && styles.activeLabel]}>
//           {label}
//         </Text>
//       )}
//       {count !== undefined && count > 0 && (
//         <Text style={[styles.count, active && styles.activeCount]}>
//           {count}
//         </Text>
//       )}
//     </TouchableOpacity>
//   );
// }

// const styles = StyleSheet.create({
//   button: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     paddingVertical: 8,
//     paddingHorizontal: 14,
//     borderRadius: 20,
//     gap: 5,
//   },
//   activeButton: {
//     backgroundColor: "#FFF0F3",
//   },
//   loader: {
//     marginRight: 4,
//   },
//   icon: {
//     fontSize: 17,
//   },
//   label: {
//     fontSize: 13,
//     color: "#7A7A8A",
//     fontWeight: "500",
//   },
//   activeLabel: {
//     color: "#FF4D6D",
//   },
//   count: {
//     fontSize: 13,
//     color: "#7A7A8A",
//     fontWeight: "600",
//   },
//   activeCount: {
//     color: "#FF4D6D",
//   },
// });
