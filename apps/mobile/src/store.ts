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
import { initialBrowsingVillage } from "./storage/browsingVillage";

type AppState = OnboardingPreferences & {
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
  clearAuthenticatedState: () => void;
  setLanguage: (language: MobileLanguage) => void;
  restore: (preferences: OnboardingPreferences) => void;
  setOffline: (offline: boolean) => void;
};
export const useAppStore = create<AppState>((set) => ({
  language: DEFAULT_MOBILE_LANGUAGE,
  confirmed: false,
  hasAuthenticated: false,
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
  setSession: (session) =>
    set((state) => ({
      session,
      browsingVillage: initialBrowsingVillage(state.browsingVillage, session),
    })),
  setDraft: (draft) => set({ draft }),
  setChallenge: (challenge) => set({ challenge }),
  clearRegistration: () =>
    set({
      draft: { firstName: "", lastName: "", mobile: "" },
      challenge: null,
      authMode: "login",
    }),
  clearAuthenticatedState: () =>
    set({
      session: null,
      browsingVillage: null,
      draft: { firstName: "", lastName: "", mobile: "" },
      challenge: null,
      authMode: "login",
      contactReturnListingId: null,
    }),
  setLanguage: (language) => set({ language }),
  restore: (preferences) =>
    set((state) => ({
      ...preferences,
      browsingVillage: initialBrowsingVillage(
        state.browsingVillage ?? preferences.browsingVillage,
        state.session,
      ),
      hydrated: true,
    })),
  setOffline: (offline) => set({ offline }),
}));
