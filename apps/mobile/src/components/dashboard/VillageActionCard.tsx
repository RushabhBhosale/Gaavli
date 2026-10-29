import { NavigationCard, type IconName } from "./primitives";

export function VillageActionCard({
  icon,
  title,
  subtitle,
  badge,
  badgeTone,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  badge?: string;
  badgeTone?: "yellow" | "blue" | "green";
  onPress: () => void;
}) {
  return (
    <NavigationCard
      icon={icon}
      title={title}
      subtitle={subtitle}
      dashboard
      badge={badge}
      badgeTone={badgeTone}
      onPress={onPress}
    />
  );
}
