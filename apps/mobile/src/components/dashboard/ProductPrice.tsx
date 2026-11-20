import type { ReactNode } from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { MobileLanguage } from "@gaavli/types";
import { messages } from "../../i18n";

// A phone in the same price slot when the seller has not set a rate.
export function ProductPrice({
  price,
  formatted,
  language,
  style,
  children,
}: {
  price: number | null;
  formatted: string;
  language: MobileLanguage;
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
}) {
  const textStyle = StyleSheet.flatten(style);
  return (
    <Text
      numberOfLines={1}
      style={style}
      accessibilityLabel={
        price === null ? messages(language).contactForPrice : undefined
      }
    >
      {price === null ? (
        <Ionicons
          accessible={false}
          name="call-outline"
          size={textStyle?.fontSize ?? 16}
          color={textStyle?.color}
        />
      ) : (
        formatted
      )}
      {children}
    </Text>
  );
}
