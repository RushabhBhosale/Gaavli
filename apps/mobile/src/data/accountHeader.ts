import { dateLocale } from "../locale";
import type { MobileLanguage, MobileUser } from "@gaavli/types";
import { hasCoordinatorRole } from "./accountAccess";

export function accountHeaderIdentity(
  account: MobileUser,
  language: MobileLanguage,
) {
  const words = account.name.trim().split(/\s+/).filter(Boolean);
  const initials = (
    words.length > 1 ? [words[0], words[words.length - 1]] : words
  )
    .map(
      (word) => word.match(/^\p{L}\p{M}*/u)?.[0] || Array.from(word)[0] || "",
    )
    .join("")
    .toLocaleUpperCase(dateLocale(language));
  const village = account.village;
  return {
    name: account.name,
    initials,
    role: hasCoordinatorRole(account)
      ? ("coordinator" as const)
      : account.isSeller
        ? ("seller" as const)
        : ("buyer" as const),
    location: village
      ? [
          language !== "en" ? village.nameMr : village.name,
          village.taluka,
          village.district,
        ]
          .filter(Boolean)
          .join(", ")
      : "",
  };
}
