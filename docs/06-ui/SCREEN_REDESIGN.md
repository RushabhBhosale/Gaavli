# Saffron and steel blue redesign — 2026-11-05

User approved the saffron and steel blue direction on 2026-11-04 (reference
mockups: `GaavliDesigns/saffron-steel/` home and product screens). This replaces
the green palette described in `UI_UX_PRD.md` §10.

## Colour roles

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Action | `primary` | `#B9520A` | Main button, selected chip, active tab, focus ring. White text 4.9:1. |
| Saffron text | `saffronText` | `#A84E0D` | Prices and text links on light surfaces. |
| Saffron decoration | `saffron` | `#E0701A` | Mic button glow, hero circle, badges. Never behind small text. |
| Saffron tint | `saffronTint` / `tint` | `#FCEBDD` / `#FEF3EA` | Icon tiles, active tab pill / text-bearing tinted surfaces. |
| Steel base | `steel` / `primaryDark` | `#35546E` | Home banner, headers, icons, strong text on tints, trust signals. |
| Steel tint | `steelTint` | `#E6EDF3` | Secondary buttons, action cards, "new" badges. |
| Page | `background` | `#F8F9FA` | Screen background; cards are white with a `#E4E7EA` border. |
| Status | `success` / `error` / `warning` | green / red / amber | Unchanged, so status never looks like an action. |

Rules: one saffron button per screen; secondary actions are steel blue; prices
are saffron text; loading shows placeholder cards (`SkeletonList`), not text.

## Screens

| # | Screen | Route | What changed |
| --- | --- | --- | --- |
| 1 | Welcome and language | `/language` | Saffron Continue, steel wordmark, steel-tint language switch. |
| 2 | Village selection | `/village` | Saffron Continue; village artwork kept (golden fields suit the palette). |
| 3 | Register / login | `/register` | Saffron submit, steel back and links. |
| 4 | OTP | `/otp` | Saffron verify, saffron focus ring on code boxes. |
| 5 | Home | `/(tabs)/home` | Steel banner with soft circles and a solid saffron mic; saffron icon tiles; skeleton listings while loading. |
| 6 | Marketplace | `/(tabs)/marketplace` | Saffron category selection and prices; skeleton feed instead of "Loading…"; no full-catalogue download (speed). |
| 7 | Product details | `/(tabs)/product/[id]` | Saffron call button, saffron price, steel seller card; skeleton while loading. |
| 8 | My listings (seller) | `/(tabs)/my-listings` | Saffron Add product, turmeric "sold" status, steel tabs. |
| 9 | Add / edit listing | `/add-listing` | Saffron save, steel secondary actions, saffron focus on fields. |
| 10 | Activity and notifications | `/(tabs)/activity`, `/notifications` | Saffron-bordered unread cards, steel unread dot; skeleton while loading. |
| 11 | Profile (settings) | `/(tabs)/profile` | Steel action cards, saffron primary. |
| 12 | My profile | `/my-profile` | Saffron save; notice strip uses the saffron border. |
| 13 | Become seller | `/become-seller` | Saffron confirm. |
| 14 | Seller contact | `/seller-contact/[id]` | Saffron call. |
| 15 | Report product | `/report-product/[id]` | Steel secondary, red stays for the report action. |
| 16 | Services / Transport directory | `/services`, `/transport` | Saffron selection; skeleton list while loading. |
| 17 | Directory entry | `/directory/[id]` | Saffron call, steel details. |
| 18 | Village information / Insights | `/village-information`, `/insights` | Upcoming placeholder in the new palette. |
| 19 | Coordinator manage | `/(tabs)/manage` | Hardcoded greens replaced by theme tokens (steel stats, saffron actions). |
| 20 | Coordinator activity and requests | `/coordinator/requests` | Same tokens as Activity. |
| 21 | Coordinator tools | `/coordinator/[...path]` | Hardcoded greens replaced; saffron primary, steel tints. |
| 22 | Tab bar | all tabs | Saffron icon and label on a soft saffron pill for the active tab. |

Not changed, pending a decision: the launcher icon and splash logo
(`assets/brand.png`, `assets/gaavli-welcome-mark.png`) are the user's approved
leaf-and-sun brand mark and stay green until a new logo is approved.
