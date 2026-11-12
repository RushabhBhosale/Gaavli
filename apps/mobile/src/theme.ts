// Gaavli design tokens: saffron and steel blue, one type scale, borders before shadows.
// Every colour in the app comes from here; the legacy keys below keep their
// names so existing screens pick up the new look without code changes.
export const theme = {
  colors: {
    // Saffron and steel blue. Saffron marks what you can tap or should notice;
    // steel blue is the calm base for headers, icons and trust signals.
    // Surfaces
    background: "#F8F9FA",
    surface: "#FFFFFF",
    surfaceMuted: "#F1F3F5",
    // Saffron for actions. White text on primary passes AA (4.9:1), and
    // primary text on tint passes AA (4.5:1).
    primary: "#B9520A",
    onPrimary: "#FFFFFF",
    primaryPressed: "#9E4508",
    // Steel blue: headers, heroes and strong text on tinted surfaces.
    primaryDark: "#35546E",
    // Header band per module, so each part of the app has its own colour.
    bandMarketplace: "#2F6A4B",
    bandServices: "#5B4B9A",
    bandActivities: "#B9520A",
    bandTransport: "#1F6B76",
    // On the steel hero
    heroText: "#FFFFFF",
    heroMuted: "#D6E2EC",
    heroSurface: "#FFFFFF1F",
    heroBorder: "#FFFFFF33",
    icon: "#35546E",
    brand: "#B9520A",
    tint: "#FEF3EA",
    saffronBorder: "#F3D2B8",
    // Named palette for new work
    saffron: "#E0701A",
    saffronTint: "#FCEBDD",
    saffronText: "#A84E0D",
    steel: "#35546E",
    steelSoft: "#476C8A",
    steelTint: "#E6EDF3",
    // Text
    heading: "#16222D",
    text: "#1E2A35",
    muted: "#5D6B77",
    placeholder: "#7A8692",
    inactive: "#66727E",
    // Lines
    border: "#E4E7EA",
    borderStrong: "#CDD3D9",
    focusBorder: "#B9520A",
    overlay: "#16222D66",
    // Turmeric accent for highlights such as "sold" and featured badges
    accent: "#9A6B0F",
    accentBackground: "#FBF0D6",
    // Status (success stays green so it never reads as an action)
    success: "#1B7A4A",
    successBackground: "#E8F4EC",
    error: "#B3261E",
    errorBackground: "#FDECEA",
    warning: "#7A4E0C",
    warningBackground: "#FFF3D6",
    info: "#35546E",
    softBlue: "#E6EDF3",
    skeleton: "#ECEEF0",
  },
  // One colour per part of the app: the header band, the section marker on
  // the dashboard and the quick-action icon all use the same pair.
  modules: {
    marketplace: { color: "#2F6A4B", tint: "#E3F1EA" },
    services: { color: "#5B4B9A", tint: "#ECE8F6" },
    transport: { color: "#1F6B76", tint: "#DFF0F2" },
    activities: { color: "#B9520A", tint: "#FEF3EA" },
  },
  radii: {
    control: 12,
    card: 16,
    chip: 999,
    pill: 999,
    artwork: 20,
    sheet: 24,
  },
  shadow: { color: "#16222D", opacity: 0.06, radius: 12 },
  interaction: { disabledOpacity: 0.5, pressedOpacity: 0.85 },
  layout: { screenPadding: 20, contentWidth: 560, touchTarget: 48 },
  spacing: 20,
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 },
  // Line heights are generous because Devanagari has tall marks above and
  // below the line.
  type: {
    display: { fontSize: 28, lineHeight: 38, fontWeight: "700" as const },
    title: { fontSize: 22, lineHeight: 32, fontWeight: "700" as const },
    heading: { fontSize: 18, lineHeight: 26, fontWeight: "700" as const },
    subheading: { fontSize: 16, lineHeight: 24, fontWeight: "600" as const },
    body: { fontSize: 16, lineHeight: 24, fontWeight: "400" as const },
    label: { fontSize: 14, lineHeight: 21, fontWeight: "600" as const },
    caption: { fontSize: 13, lineHeight: 19, fontWeight: "400" as const },
    micro: { fontSize: 12, lineHeight: 17, fontWeight: "600" as const },
  },
  // Decorative artwork: a village at dawn with golden fields, kept apart
  // from control colours.
  illustration: {
    sky: "#FDEBD8",
    farHill: "#B9C9D6",
    hill: "#8FA9BE",
    field: "#D9A441",
    house: "#FFF4E6",
    roof: "#B9520A",
    wood: "#6B4A2E",
    tree: "#4F7A5A",
  },
};
