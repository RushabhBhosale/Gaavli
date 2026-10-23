import { create } from "zustand";
import { DEFAULT_MOBILE_LANGUAGE } from "@gaavli/constants";
import type {
  MobileLanguage,
  MobileSession,
  RegistrationDraft,
  OtpChallenge,
  MobileVillage,
} from "@gaavli/types";
import type { OnboardingPreferences } from "./storage/preferences";

type AppState = OnboardingPreferences & {
  browsingVillage: MobileVillage | null;
  setBrowsingVillage: (village: MobileVillage | null) => void;
  hydrated: boolean;
  offline: boolean;
  session: MobileSession | null;
  draft: RegistrationDraft;
  challenge: OtpChallenge | null;
  authMode: "login" | "register";
  contactReturnListingId: string | null;
  setAuthMode: (mode: "login" | "register") => void;
  setContactReturn: (listingId: string | null) => void;
  setSession: (session: MobileSession | null) => void;
  setDraft: (draft: RegistrationDraft) => void;
  setChallenge: (challenge: OtpChallenge | null) => void;
  clearRegistration: () => void;
  setLanguage: (language: MobileLanguage) => void;
  restore: (preferences: OnboardingPreferences) => void;
  setOffline: (offline: boolean) => void;
};
export const useAppStore = create<AppState>((set) => ({
  language: DEFAULT_MOBILE_LANGUAGE,
  confirmed: false,
  guestVillage: null,
  browsingVillage: null,
  setBrowsingVillage: (browsingVillage) => set({ browsingVillage }),
  hydrated: false,
  offline: false,
  session: null,
  draft: { firstName: "", lastName: "", mobile: "" },
  challenge: null,
  authMode: "register",
  contactReturnListingId: null,
  setAuthMode: (authMode) => set({ authMode, challenge: null }),
  setContactReturn: (contactReturnListingId) => set({ contactReturnListingId }),
  setSession: (session) => set({ session }),
  setDraft: (draft) => set({ draft }),
  setChallenge: (challenge) => set({ challenge }),
  clearRegistration: () =>
    set({
      draft: { firstName: "", lastName: "", mobile: "" },
      challenge: null,
      authMode: "login",
    }),
  setLanguage: (language) => set({ language }),
  restore: (preferences) => set({ ...preferences, hydrated: true }),
  setOffline: (offline) => set({ offline }),
}));
