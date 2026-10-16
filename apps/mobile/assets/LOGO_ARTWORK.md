# Retired logo experiment — 2026-10-13

Reverted at the user's request. This document is a historical record only. The
user-provided Marathi logo and its PNG derivatives are no longer used by the app;
the previous leaf-and-sun branding and layout have been restored. See
`WELCOME_ARTWORK.md` for the active welcome/splash artwork. Details below describe
the withdrawn implementation, not current behavior.

Source: user-provided `गावली Green and Gold Logo.png`. The original depicts the
green-and-gold emblem and Marathi wordmark on a paper mockup. A transparent cutout
was prepared with the built-in image editing tool and visually compared against
the source, then trimmed/resized using the existing Sharp dependency. The source
in Downloads is unchanged. No runtime image service or new dependency is used.

- `gaavli-logo.png`: transparent full logo, 640 × 513. Shared `GaavliLogo` renders
  this on welcome, registration and startup screens. The Marathi wordmark is part
  of the image and stays the same in both interface languages.
- `gaavli-icon.png`: opaque cream 1024 × 1024 launcher/iOS icon.
- `gaavli-adaptive-icon.png`: transparent padded 1024 × 1024 Android foreground,
  with the whole logo fitting within the adaptive icon safe area.

App configuration uses the full logo for the native splash. Existing Android
launcher/splash resources are also updated. Native icons and splash require a
development-client rebuild; Metro reload updates the in-app screens only.
`node scripts/prepare-mobile-logo.cjs` from the root regenerates derived assets
and existing Android resources from the approved local logo. Earlier `brand.png`
and `gaavli-welcome-mark.png` remain historical assets and are no longer referenced.

## Final background-extraction prompt

Use case: background-extraction. Exact original logo extraction from supplied edit target. Remove ONLY the paper background around the existing logo, leave the original letterforms and colors unchanged. Output the identical green-and-gold emblem and the exact Marathi word गावली underneath on TRUE transparency. Every filled letter must be fully opaque (alpha 255); only pixels outside the crisp edges and in letter counters are transparent. Keep the white gap between green and gold transparent. Original solid dark green letters with gold swoosh, same proportions. Tight full-logo bounding box, small margin. NO glow, NO haze, NO green mist, NO translucency in the letters, NO shadows, NO new background. This is a clean cutout, not a redesign. Make every existing letter sharp and legible.
