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
| 5 | Home | `/(tabs)/home` | One Home for every role (guest, buyer, seller, coordinator); the old Coordinator/Buyer/Seller switch tabs are removed. Steel banner with soft circles and a solid saffron mic; saffron icon tiles; skeleton listings while loading. |
| 6 | Marketplace | `/(tabs)/marketplace` | Saffron category selection and prices; skeleton feed instead of "Loading…"; no full-catalogue download (speed). One row per product and unit with a price range and seller count. |
| 6a | Search | `/search` | Full-screen search opened from Home: live product suggestions with price range, recent searches, popular picks, category tiles and a mic. |
| 7 | Product details | `/(tabs)/product/[id]` | Saffron call button, saffron price, steel seller card; skeleton while loading; seller tags as small green chips under the title; "Sellers offering this" lists every seller with name, phone, price and a Call button (guests are asked to sign in). |
| 8 | My listings (seller) | `/(tabs)/my-listings` | Saffron Add product, turmeric "sold" status, steel tabs. |
| 9 | Add / edit listing | `/add-listing` | Rebuilt 2026-11-06: one tap-to-change photo tile (camera, gallery and remove in a bottom sheet, no photo buttons on the page); three white step cards (product and freshness, quantity and price, tags); freshness and unit as tappable pills; ₹ price field showing "per kg"; description removed (old descriptions still show to buyers); up to 5 product-group tags such as Organic, Desi, Desi cow; save button pinned at the bottom. |
| 10 | Activity and notifications | `/(tabs)/activity`, `/notifications` | Saffron-bordered unread cards, steel unread dot; skeleton while loading. |
| 11 | Profile (settings) | `/(tabs)/profile` | Steel action cards, saffron primary. |
| 12 | My profile | `/my-profile` | Saffron save; notice strip uses the saffron border. |
| 13 | Become seller | `/become-seller` | Saffron confirm. |
| 14 | Seller contact | `/seller-contact/[id]` | Saffron call. |
| 15 | Report product | `/report-product/[id]` | Steel secondary, red stays for the report action. |
| 16 | Services / Transport directory | `/services`, `/transport` | Category dashboard (2026-11-09): two-column photo tiles (a real Wikimedia Commons photo per category, name and live count on a dark strip), six shown first with populated ones leading, "See N more" opens the rest in place; typing in the header search shows a flat result list. Photo credits: Settings, Photo credits. |
| 17 | Directory entry | `/directory/[id]` | Saffron call, steel details. |
| 18 | Village coordinator / Insights | `/village-coordinator`, `/insights` | Village information removed. New coordinator page: name, village, what to ask them, big Call button. Insights is still the upcoming placeholder. |
| 19 | Coordinator manage | `/(tabs)/manage` | Hardcoded greens replaced by theme tokens (steel stats, saffron actions). |
| 20 | Coordinator activity and requests | `/coordinator/requests` | Same tokens as Activity. |
| 21 | Coordinator tools | `/coordinator/[...path]` | Hardcoded greens replaced; saffron primary, steel tints. |
| 22 | Tab bar | all tabs | Five slots, Speak always in the middle (2026-11-09). Guest: Home, Market, Speak, Gram Seva, Transport. Buyer: Home, Market, Speak, Activity, Settings. Seller and coordinator: their own work, Speak, Activity, and a **More** button that opens a sheet with Market, Gram Seva, Transport and Settings (a coordinator also gets **My activity**, their own requests as a buyer or seller); More shows as selected while one of those pages is open. |

Not changed, pending a decision: the launcher icon and splash logo
(`assets/brand.png`, `assets/gaavli-welcome-mark.png`) are the user's approved
leaf-and-sun brand mark and stay green until a new logo is approved.

## Shared header (2026-11-09)

Every inner screen uses one `AppHeader` (`apps/mobile/src/components/AppHeader.tsx`):
a steel-blue band, the same colour as Home's banner, rounded at the bottom and
drawn behind the status bar. It holds the back button (a translucent circle),
the title, an optional subtitle or greeting line, a slot on the right (village
selector, bell, a "Save" pill) and room underneath for a search field
(`HeaderSearch`) or stat tiles. `Screen` and `DashboardScreen` take it as a
`header` prop. Pages that need work before leaving (the product form saving a
draft) pass `onBack`; the rest pass `back="/route"`, which goes back in
history or to that route.

Uses it: Marketplace, My products, Services, Transport, Activity, Settings, My
profile, Add or edit product, Search, Village coordinator, Seller contact,
Report, service details, every coordinator page (Manage, Users, Add buyer,
Connections, Add village, Activity). Home keeps its own banner and the product
page keeps its photo header. The old `PageSceneHeader`, `MarketplaceHeader` and
`ScreenHeader` are gone.

Manage is the coordinator's start page: the banner carries the greeting, the
role, the village chip (a dropdown when they have several) and the three
numbers; below it are the three jobs as large cards with saffron icon tiles.
