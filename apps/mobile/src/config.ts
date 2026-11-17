// Where "Email Gaavli" goes. Set EXPO_PUBLIC_SUPPORT_EMAIL in the app's
// environment; with no address set, the email option is hidden.
export const SUPPORT_EMAIL = (
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? ""
).trim();
