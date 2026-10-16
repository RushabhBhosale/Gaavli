import { theme } from "../theme";
import { StyleSheet, View } from "react-native";

// Small native shapes keep the welcome illustration local and inexpensive.
export function Countryside() {
  return (
    <View
      style={s.scene}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={s.sun} />
      <View style={s.farHill} />
      <View style={s.hill} />
      <View style={s.field} />
      <View style={s.house} />
      <View style={s.roof} />
      <View style={s.door} />
      <View style={s.trunk} />
      <View style={s.tree} />
    </View>
  );
}
const s = StyleSheet.create({
  scene: {
    height: 108,
    overflow: "hidden",
    borderRadius: theme.radii.artwork,
    backgroundColor: theme.illustration.sky,
  },
  sun: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.accent,
    right: 58,
    top: 12,
  },
  farHill: {
    position: "absolute",
    width: "120%",
    height: 150,
    borderRadius: 180,
    backgroundColor: theme.illustration.farHill,
    left: -65,
    top: 43,
    transform: [{ rotate: "-10deg" }],
  },
  hill: {
    position: "absolute",
    width: "95%",
    height: 120,
    borderRadius: 150,
    backgroundColor: theme.illustration.hill,
    right: -65,
    top: 53,
  },
  field: {
    position: "absolute",
    height: 27,
    bottom: -7,
    width: "115%",
    left: -15,
    backgroundColor: theme.illustration.field,
    transform: [{ rotate: "-4deg" }],
  },
  house: {
    position: "absolute",
    left: "58%",
    bottom: 24,
    width: 35,
    height: 28,
    backgroundColor: theme.illustration.house,
  },
  roof: {
    position: "absolute",
    left: "58%",
    bottom: 51,
    width: 0,
    height: 0,
    borderLeftWidth: 18,
    borderRightWidth: 18,
    borderBottomWidth: 18,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: theme.illustration.roof,
  },
  door: {
    position: "absolute",
    left: "62%",
    bottom: 24,
    width: 8,
    height: 17,
    backgroundColor: theme.illustration.wood,
  },
  trunk: {
    position: "absolute",
    left: "21%",
    bottom: 23,
    width: 5,
    height: 38,
    backgroundColor: theme.illustration.wood,
  },
  tree: {
    position: "absolute",
    left: "16%",
    bottom: 45,
    width: 37,
    height: 42,
    borderRadius: 20,
    backgroundColor: theme.illustration.tree,
  },
});
