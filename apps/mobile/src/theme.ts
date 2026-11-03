// Gaavli design tokens. One calm palette, one type scale, borders before shadows.
// Every colour in the app comes from here; the legacy keys below keep their
// names so existing screens pick up the new look without code changes.
export const theme = {
  colors: {
    // Surfaces
    background: "#F6F7F3",
    surface: "#FFFFFF",
    surfaceMuted: "#EFF2EA",
    // Brand green. White text on primary passes AA (5.3:1).
    primary: "#1B7A4A",
    onPrimary: "#FFFFFF",
    primaryPressed: "#156B3F",
    primaryDark: "#0F3D2B",
    icon: "#1B7A4A",
    brand: "#1B7A4A",
    tint: "#EAF4EE",
    softGreen: "#BFDCCB",
    // Text
    heading: "#14241B",
    text: "#1E2B23",
    muted: "#5B685F",
    placeholder: "#7B877F",
    inactive: "#66736B",
    // Lines
    border: "#E2E7DE",
    borderStrong: "#CBD3C8",
    focusBorder: "#1B7A4A",
    overlay: "#14241B66",
    // Warm accent, used sparingly for highlights and warnings
    accent: "#B7791F",
    accentBackground: "#FFF3D6",
    // Status
    success: "#1B7A4A",
    successBackground: "#EAF4EE",
    error: "#B3261E",
    errorBackground: "#FDECEA",
    warning: "#7A4E0C",
    warningBackground: "#FFF3D6",
    info: "#1F5FA8",
    softBlue: "#E8F0FA",
    skeleton: "#E9EDE5",
  },
  radii: {
    control: 12,
    card: 16,
    chip: 999,
    pill: 999,
    artwork: 20,
    sheet: 24,
  },
  shadow: { color: "#14241B", opacity: 0.05, radius: 10 },
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
  // Decorative native artwork is kept separate from control colours.
  illustration: {
    sky: "#F4F2D9",
    farHill: "#C7D9BA",
    hill: "#A6C785",
    field: "#7EA84B",
    house: "#F7EAC0",
    roof: "#B97145",
    wood: "#795634",
    tree: "#488633",
  },
};
