import { PROVIDER_KINDS } from "@gaavli/constants";
import type { z } from "zod";
import type { providerProfileSchema } from "@gaavli/validation";
import { openState } from "./operatingHours";

export type ActivityCardData = {
  id: string;
  kind: "profile" | "products";
  title: string;
  detail?: string;
  providerType?: string;
  active?: boolean;
  hours?: string | null;
  closed?: boolean;
};

export function providerActivity(
  profile: Pick<
    z.infer<typeof providerProfileSchema>,
    "id" | "name" | "providerType" | "status" | "details"
  >,
): ActivityCardData {
  const hoursField = PROVIDER_KINDS[profile.providerType].fields.find(
    (field) => field.kind === "hours",
  );
  const hours = hoursField ? profile.details[hoursField.key] : null;
  return {
    id: profile.id,
    kind: "profile",
    title: profile.name,
    providerType: profile.providerType,
    active: profile.status === "ACTIVE",
    hours: typeof hours === "string" ? hours : null,
    closed: profile.details.closedNow === true,
  };
}

export function activityStatus(card: ActivityCardData, now = new Date()) {
  if (card.kind !== "profile") return null;
  if (card.active === false) return "inactive";
  return openState(card.hours, !!card.closed, now);
}
