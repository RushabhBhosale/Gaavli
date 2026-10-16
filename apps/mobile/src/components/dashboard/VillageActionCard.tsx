import { NavigationCard, type IconName } from "./primitives";

export function VillageActionCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <NavigationCard
      icon={icon}
      title={title}
      subtitle={subtitle}
      onPress={onPress}
    />
  );
}
