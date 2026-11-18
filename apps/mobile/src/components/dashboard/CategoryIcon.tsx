import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

// A category's icon. Names are Ionicons; "mci:" picks MaterialCommunityIcons
// for things Ionicons has no picture of (rickshaw, tractor).
export function CategoryIcon({
  name,
  size,
  color,
}: {
  name: string;
  size: number;
  color: string;
}) {
  if (name.startsWith("mci:"))
    return (
      <MaterialCommunityIcons
        accessible={false}
        name={
          name.slice(4) as React.ComponentProps<
            typeof MaterialCommunityIcons
          >["name"]
        }
        size={size}
        color={color}
      />
    );
  return (
    <Ionicons
      accessible={false}
      name={name as React.ComponentProps<typeof Ionicons>["name"]}
      size={size}
      color={color}
    />
  );
}
