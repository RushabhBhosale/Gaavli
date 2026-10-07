# Farmer–Buyer Connect — Product Requirements

**Version:** 1.2 — Technical Stack Revision\
**Purpose:** Master product specification for AI-assisted development\
**Primary users:** Farmers/sellers, buyers, village coordinators, platform administrator\
**Region:** Konkan, Maharashtra — pilot at gram panchayat / 10 km radius scale

### What's new in v1.1

-   **Services Directory moved from "near-term" into in-scope for this
    version** (§11), with a defined search model across profession,
    service category, and free-text keywords (§11.1).
-   Coordinator-to-village relationship corrected to many-to-many (§3.4,
    §13).
-   Registration gains an optional "service keywords" field (§4).
-   Database schema (§13) made comprehensive — full field lists,
    explicit primary/foreign keys, and designed for extensibility
    (roles as a table, one table per future module) rather than just
    illustrative.
-   New **Offline and Low-Connectivity Resilience** section (§16),
    reflecting that unstable internet, low bandwidth, and power cuts are
    a baseline condition for the target users, not an edge case.
-   New **Recommended Technology Stack** section (§22).

## Current Approved Technical Decisions

This section supersedes earlier technical-stack recommendations in this document. Product requirements and scope remain unchanged.

- **Primary coding agent:** Codex. Global instructions are in `/AGENTS.md`; app-specific instructions are in `apps/mobile/AGENTS.md` and `apps/web/AGENTS.md`.
- **Design agent:** Lovable is UI/UX design and prototype only. Codex implements production software.
- **Package management:** npm workspaces with `package-lock.json`; no pnpm or Yarn. Do not introduce Turborepo or another monorepo orchestrator without approval.
- **Applications:** `apps/mobile` is React Native + Expo + TypeScript + Expo Router. `apps/web` is Next.js + TypeScript and contains Admin UI, REST API, and server-side application logic.
- **Mobile state/offline:** Zustand, TanStack Query, Expo SQLite, Expo SecureStore, NetInfo, and Expo Notifications.
- **Backend/data:** Next.js Route Handlers, reusable server-side application services, Zod, repositories, Mongoose, MongoDB Atlas, and MongoDB Atlas Search. MongoDB is server-only; mobile uses REST/JSON.
- **Admin UI:** Next.js, shadcn/ui, and TanStack Table, sharing the same server-side application services and authorization rules.
- **Shared packages:** `packages/types`, `packages/validation`, `packages/constants`, and `packages/utils`; apps depend on packages, never the reverse.
- **Other approved components:** Cloudflare R2/AWS S3, Sentry, provider abstractions, and a modular monolith.
- Runtime LLM services are not required for deterministic MVP behavior. Keep the product rules and scope in this document intact.

The implementation status is tracked separately in `docs/IMPLEMENTATION_STATUS.md`; these decisions describe the target, not proof that code exists.

## 1. Product Vision

Build a hyperlocal, free-to-use platform that lets small-scale producers (rice,
vegetables, flowers, fruit, spices) in remote villages list what they have and
be discovered by nearby buyers — without the platform handling money,
delivery, or negotiation. The app only makes the introduction; the
transaction happens directly between farmer and buyer.

The platform is also designed to grow, without redesign, into a broader
village service directory — utility services (carpenter, electrician,
plumber), medical services, local shops — with produce as the flagship,
fully-built module and the others shipped as clearly-labelled "coming soon"
tiles until validated with real users.

The product is explicitly **not a marketplace with payment/escrow, not a
chat platform, and not a full CRM.** It is a discovery and introduction
layer, run as a community service rather than a commercial product.

## 2. Core Principles

1.  The app never handles money, delivery, or negotiation — it only reveals
    contact details once a buyer expresses interest.
2.  Every registered person is a single account, not a type. Role is
    derived from activity (buyer by default, seller once they publish a
    listing) or explicitly granted (coordinator, by admin).
3.  Registration happens once. OTP verifies identity a single time; a
    persistent session keeps the user logged in indefinitely afterward.
4.  Guests can browse without registering. Registration is asked for only
    at the moment a guest wants a farmer's contact details, never earlier.
5.  No farmer or buyer phone number is ever messaged without explicit
    opt-in, and opt-out (STOP/NO) must always work.
6.  Messaging cost is a first-class design constraint. In-app notifications
    are free and instant; WhatsApp/SMS are chargeable and must be batched,
    not sent per event.
7.  Village proximity is a manually curated fact, not a computed one.
    Straight-line/GPS distance is only a suggestion; a human (coordinator,
    with admin override) confirms what "nearby" actually means on the
    ground.
8.  Every destructive action (delete village, delete coordinator, delete
    category) must show its real dependencies before proceeding, and must
    offer deactivate/reassign as an alternative to hard delete.
9.  Every role grant or change (coordinator assigned/removed) triggers a
    notification to the affected user. Nothing changes silently.
10. The product must earn every field it asks for. Registration stays
    minimal; anything beyond phone number is optional, including the v1.1
    professional/service-listing fields.
11. Admin has full rights across every module for the pilot, with every
    admin action captured in an audit log as the compensating control for
    not requiring 2FA at this stage.
12. Marathi is the default language for new accounts, not an
    English-first afterthought, given the primary user base.

## 3. User Roles

Farmer, Buyer, and Village Coordinator are **not separate account types.**
They are one account with role flags. Only Guest (unauthenticated) and
Super Admin (separate credential system) are structurally distinct.

### 3.1 Guest (unauthenticated)

A guest can:

-   Select or auto-detect their village.
-   Browse active produce listings for that village and its mapped nearby
    villages.
-   See item, quantity/rate, village, and recency — never a farmer's name
    or contact.
-   Search, including voice search.
-   Register at the point of tapping "Interested" on any listing.

### 3.2 Buyer (default role for every registered account)

Every registered user starts here. A buyer can:

-   See a daily/cadence-based feed of nearby listings (Home).
-   Search, including voice search, with faded "previously available —
    notify me" results.
-   View full listing detail and reveal a farmer's contact after tapping
    "Interested."
-   Use the "Notify farmer" fallback if a revealed contact doesn't answer.
-   Save favorite farmers and item-level "notify me" subscriptions.
-   View and personalize their nearby-village list ("My Area").
-   See their village's assigned coordinator(s) on Home.
-   Switch app language (Marathi/Hindi/English).
-   Optionally support the service financially (voluntary, never
    mandatory).

### 3.3 Seller (earned role, layered on Buyer)

Unlocked the moment a buyer publishes their first listing — never chosen
at registration. A seller additionally can:

-   Add a listing: category tier, item name (typeahead-assisted,
    optionally voice-entered), flexible quantity/unit, optional rate,
    optional photo, editable expiry date.
-   See duplicate-listing detection when a new listing closely matches an
    existing active one, with the option to update instead of duplicate.
-   View all own listings (active/expired) and demand insight (views,
    interested count) per listing.
-   Mark a listing sold out or reduce its quantity without deleting it.
-   Relist an expired listing in one tap.
-   See and act on "buyer tried to reach you" pings.

The Seller tab, once unlocked, is permanent — including an empty state for
a seasonal seller with zero current listings.

### 3.4 Village Coordinator (role flag, admin-granted)

A trusted local person, assigned by admin to one or more villages. A
village may also have more than one coordinator where useful (e.g. a
larger village, or a handover period between an outgoing and incoming
coordinator) — coordinator-to-village is a many-to-many relationship, not
one-to-one. A coordinator additionally can:

-   Register a buyer who has no smartphone (name + number), triggering an
    SMS/WhatsApp opt-in request on that buyer's behalf.
-   View and bulk-resend pending opt-in requests.
-   Confirm, edit, or add to the village's nearby-village proximity
    mapping (distance-based suggestions are only a starting point).
-   Lightly moderate listings in their village (remove on report).
-   View a monthly impact report (new buyers, listings, connections) to
    share with the panchayat or a funder.

Removing the coordinator role clears the flag and reassigns the village
only — it never touches the person's own buyer/seller history.

### 3.5 Super Admin

Structurally separate from the unified account model; not part of the app
registration flow.

-   Username + password login (no 2FA in v1.0 — see §14 for compensating
    controls).
-   Full CRUD, with search/sort/filter/pagination, over: Users, Villages,
    Categories, Message Templates, Village Proximity (global), Reports,
    Flagged content, Audit Log, Platform Settings.
-   Assigns/removes the coordinator role on any user.
-   Every delete flows through a dependency check before proceeding.

## 4. Registration and Authentication

### Farmer/Buyer/Coordinator registration (unified)

Required:

-   Mobile number
-   OTP verification

Optional:

-   Name
-   Notification category preferences
-   Professional/service details (v1.1 — see §11)
-   Service keywords — free-text tags for secondary skills/services beyond
    the user's main profession (e.g. a carpenter who also drives), used
    to surface them in service search even when their main profession
    doesn't match the search term (v1.1 — see §11)

Sequence:

``` text
Guest browses (no login)
       ↓
Taps "Interested" on a listing
       ↓
Enter mobile number
       ↓
Send OTP
       ↓
Verify OTP
       ↓
Create verified account, default role = Buyer
       ↓
Capture notification category opt-in (same screen)
       ↓
Issue persistent session token
       ↓
Reveal contact details
```

OTP is never asked again after this point for this account. On every
subsequent app open, the stored session token is checked instead of asking
for the phone number again — see "Session/token handling" below for
token handling and edge cases where OTP legitimately reappears (logout,
reinstall, revoked token).

### Admin login

``` text
Enter username + password
       ↓
Validate credentials
       ↓
On failure: increment failure count, show attempts-remaining message
       ↓
On threshold: temporary lockout, logged to Audit Log
       ↓
On success: issue admin session (short expiry, unlike buyer/seller
sessions)
```

### OTP requirements

-   OTP must expire.
-   OTP must have a maximum attempt count.
-   Resend must be rate limited.
-   OTP requests must be rate limited by phone/device/IP as appropriate.
-   OTP must never be stored in plaintext.
-   Verification attempts must be logged for audit.
-   Provider must be abstracted behind an OTP service interface so it can
    be swapped later (e.g., Firebase Phone Auth or an equivalent managed
    provider) without a rewrite.

### Session/token handling

-   On successful OTP, issue a long-lived session/refresh token pair,
    stored in the device's secure storage (Keychain/Keystore), never the
    phone number or OTP itself.
-   Token is silently refreshed on app use; a buyer/seller/coordinator
    session should not force re-authentication under normal continued use.
-   OTP reappears only on: explicit logout, reinstall/new device, token
    revocation, or an admin-configured maximum idle period.
-   Admin sessions intentionally do **not** follow this "stays logged in"
    pattern — see §14.

## 5. Guest Browsing and Registration Gating

Guest browsing is a deliberate, permanent product decision, not a
placeholder:

``` text
Splash
   ↓
Select village (geolocation-suggested default, manually overridable)
   ↓
Browse listings: item, qty/rate, village, recency — no name/contact
   ↓
Search (including voice)
   ↓
Tap "Interested"
   ↓
Registration (§4) — the only point a phone number is requested
   ↓
Contact details revealed
```

Rationale:

-   Removes friction from browsing; the highest-value moment to ask for
    commitment is when the buyer is already motivated to act.
-   Protects farmers: only a registered, verified number can unlock
    contact details, limiting bulk scraping.
-   Collapses two asks (registration, notification opt-in) into one
    natural moment instead of two separate interruptions.

If geolocation permission is denied or unavailable, fall back to manual
village selection with no error state; remember the last manual choice
locally.

## 6. Village and Proximity Mapping

Straight-line/GPS distance is not a reliable proxy for "nearby" in Konkan
terrain (ghats, rivers, patchy road connectivity). Two GPS-close villages
can be practically far apart by road, and vice versa.

``` text
Village created (admin)
   ↓
System suggests nearby villages by haversine distance
   ↓
Coordinator reviews each suggestion against real travel knowledge
   ↓
Coordinator confirms / rejects / adds manually
   ↓
Confirmed mapping becomes the default for that village
   ↓
Every new registered user in that village inherits the default
   ↓
User may personalize: add villages, remove villages ("My Area")
   ↓
Personalization stored as a diff (added[] / removed[]) from the default,
not a full copy — a later coordinator correction still reaches every user
who has not personally touched that specific village
   ↓
User may "Reset to default" at any time
```

Admin has cross-village visibility and override rights over every
coordinator's mapping; every admin override is recorded in the Audit Log
distinctly from a coordinator's own edit.

## 7. Category Tiers and Listings

Categories are deliberately generic tiers, not specific items, and are
**chosen by the farmer at listing time** — not derived from a pre-built
item catalog, since actual shelf life depends on that day's harvest
condition, which only the farmer knows.

Default tiers (admin-configurable, each shown with a plain-language
example at selection time so the choice is intuitive, not abstract):

| Tier | Example | Default shelf life | Notify mode |
|---|---|---|---|
| Perishable | Leafy greens, flowers | 1–2 days | Daily digest |
| Recurring supply | Milk, eggs | Standing | Change-only |
| Mid shelf-life | Most vegetables | ~7 days | Daily digest |
| Long shelf-life | Cashew, pepper, grains | 30+ days | Weekly digest |

### Add Listing flow

``` text
Select category tier (with example text per option)
       ↓
Enter item name (typeahead suggestions from prior usage; voice input
available, transcription always shown back as editable before submit)
       ↓
System checks for a close-match active listing by the same farmer
       ↓
   Match found ──────────────▶ Offer: "Update existing listing instead?"
       │                                   ↓
       │                          Update (no duplicate created)
       ▼
   No match — continue
       ↓
Enter quantity + item-appropriate unit (kg, bunches, pieces, size
small/medium/large — never forced to kg for farmers without a scale)
       ↓
Rate (optional — listing without a price is supported)
       ↓
Photo (optional)
       ↓
Listing expiry — prefilled from category default, editable
       ↓
Publish
```

### Listing lifecycle

``` text
Published (active)
   ↓
Auto-expires at category/custom-set expiry
   ↓
Renewal nudge sent to farmer: "Still have stock? Reply YES to relist"
   ↓
   YES → relisted, same flow as publish
   No reply → stays expired, retained in history for audit/reporting
```

### Duplicate/spam guardrails

-   **Primary mechanism:** fuzzy name-matching against the same farmer's
    own active listings at the moment of listing creation (solves the
    "Tomato" / "Tomatoe" / "tooommmtooo" problem directly).
-   **Backstop mechanism:** a generous overall active-listing ceiling per
    user (default 10, admin-configurable), independent of category,
    guarding against bad-faith bulk listing without constraining a farmer
    with genuinely diverse produce.
-   Buyer-facing search applies the same fuzzy matching so near-duplicate
    spellings surface under one normalized result.

## 8. Search and Discovery

-   Text search with typeahead, available to guests and registered users.
-   Voice search (Marathi/Hindi/English) via the device's speech-to-text
    capability; transcribed query shown before executing.
-   Results split into **Available now** and **Previously available — may
    return** (faded, de-emphasized), the latter carrying a "Notify me"
    action that creates a standing farmer+item subscription rather than
    requiring the buyer to search repeatedly.
-   Saved searches and favorite farmers, consolidated in one screen.

## 9. Notifications and Messaging

Three channels, each with a distinct cost and delivery model:

| Channel | Cost | Timing |
|---|---|---|
| In-app | Free | Instant, on every relevant event |
| WhatsApp | Chargeable (Business API, per-message) | Batched |
| SMS | Chargeable (DLT-registered) | Batched |

### Batched digest logic

``` text
Daily at 06:00
   ↓
For each opted-in buyer:
   ↓
   Check each subscribed category's cadence rule (§7 table)
   ↓
   Perishable/Mid shelf-life: include if new since last digest
   Recurring supply: include only on change (price/stockout/new supplier)
   Long shelf-life: include only on weekly cycle or on change
   ↓
   Anything to report? ── No ──▶ Skip. No message sent to this buyer today.
   ↓ Yes
   Compose ONE combined message across all applicable categories
   ↓
   Send via buyer's channel (WhatsApp if app-installed and eligible,
   else SMS)
```

Rules:

-   Never send a separate message per listing or per farmer; always batch
    into one message per buyer per applicable run.
-   Every buyer-facing SMS/WhatsApp template must exist in every
    supported language (English, Marathi at minimum) as **separate,
    independently DLT-approved template variants** — DLT approval is tied
    to exact wording per language.
-   Every message is either **Transactional** (listing alert, opt-in
    confirmation, relist nudge) or **Promotional** (re-engagement), and
    must be flagged as such — the two follow different DLT/DND compliance
    rules and cannot be treated interchangeably.
-   Opt-out (STOP/NO) must always be honored immediately and permanently
    for that number.

### Promotional / re-engagement messaging (admin-controlled)

Narrow and infrequent by design:

-   Target: accounts with no app activity in 30+ days (configurable).
-   Framed as an activity update ("3 farmers near you listed produce this
    week"), not generic promotional copy — stays closer to transactional
    in spirit and is more likely to actually work.
-   Frequency cap: once per month per user, enforced by the system, not
    left to manual discipline.

### In-app "notify farmer" fallback

If a buyer taps Call from a revealed contact and doesn't connect, they can
send an in-app + SMS ping to the farmer's dashboard ("A buyer tried to
reach you"). Auto-suggested if the buyer reopens the same listing shortly
after viewing the contact.

## 10. Village Coordinator Module ("Manage" tab)

Reached via a segmented control on the same Home screen a coordinator uses
as a buyer/seller — not a separate app, login, or account.

``` text
Admin assigns coordinator role to an existing user, for a village
   ↓
In-app notification sent: "You've been made coordinator for {village}"
   ↓
"Manage" tab appears on that user's Home
   ↓
Coordinator: adds non-app buyers, confirms proximity mapping,
moderates listings, views impact report
```

Role removal follows the same notification principle and only clears the
flag — see §3.4.

## 11. Services Directory (in scope for v1.1 — optional, self-declared)

A second module alongside the produce marketplace, kept structurally
separate in the data model (§13) but sharing the same interaction
patterns, now brought into active scope for this version. Marketplace
remains the flagship, most-used module; Services Directory is the second
fully-built one.

Design rules:

-   **Self-declared only.** A user optionally adds their own
    profession/service (carpenter, electrician, plumber, shop, doctor,
    etc.) to their own profile — never entered by a coordinator or admin
    on someone else's behalf. This keeps the same trust/liability model
    as produce listings: nobody's information appears unless they put it
    there themselves.
-   **Optional at every step.** These fields are never required at
    registration or at any other point.
-   **No verification claim.** The app does not verify professional
    credentials; a visible, plain-language disclaimer accompanies every
    service listing. Entries tagged under the Medical category carry a
    more prominent version of this disclaimer, given the higher
    real-world stakes of inaccurate medical information reaching
    someone.
-   **No expiry/shelf-life model.** Unlike produce, a profession listing
    does not go stale — no relist nudges, no category tiers from §7.
-   **Same interaction pattern as produce:** searchable, contact revealed
    through the same guest-gated flow already built for listings — new
    users don't have to learn a second pattern.
-   **Dashboard is tile-based**, with Marketplace and Services Directory
    (covering Utility and general Shop/Other listings) as the two
    fully-live tiles for this version. Medical listings are included
    within Services Directory itself (not a separate tile) given the
    smaller expected volume and the extra disclaimer already noted.
    Transport remains a distinctly labeled "Coming soon" tile — see
    below.

### 11.1 Service search model

Search must match across three fields, not just one, so a single listing
is discoverable multiple ways without the user having to register
multiple times:

``` text
Search query entered (e.g. "driver")
       ↓
Match against, for every service_listing:
   ├── profession_service (main)   — e.g. "Driver"
   ├── service_category            — e.g. Utility / Medical / Shop / Other
   └── keywords []                 — e.g. a carpenter who also drives
                                       adds "driver" as a keyword
       ↓
Return the union of matches, not just an exact match on one field
       ↓
Result: a search for "driver" surfaces both users whose MAIN profession
is driver, and users who only tagged "driver" as a secondary keyword —
e.g. a carpenter who also drives shows up without needing a second,
separate listing
```

-   `service_category` is a constrained field (Utility, Medical, Shop,
    Other) used for tile-level filtering (browsing "Utility Services")
    and as a third search-matchable field alongside the free-text
    `profession_service` and `keywords[]`.
-   Search should be typo-tolerant (same fuzzy-matching approach used for
    produce item names in §7) given the same village-level typing
    patterns apply here.
-   Guests can search the Services Directory the same way they browse
    produce (§5) — name/contact gated behind registration at the point
    of "Interested"/"Contact," reusing the exact same gating flow.

Explicitly deferred, not in scope for this version:

-   **Transport module** — a live-coordination problem (who's available
    right now, where, safety), fundamentally different from a searchable
    directory, and requires its own design effort later.

## 12. Super Admin Module

Full detail in the companion wireframe set. Functional requirements:

-   **Dashboard:** every summary tile is clickable and routes to the
    corresponding list screen.
-   **Every list screen** (Users, Villages, Categories, Templates,
    Villages & Proximity, Flagged, Audit Log) has: search on the natural
    identifying field, sortable columns, filter chips for state, and
    pagination.
-   **Every entity supports full CRUD**, with a hard distinction between
    **Deactivate** (hides from active use, preserves history for
    reporting/compliance) and **Delete** (rare, dependency-checked,
    harder to reach).
-   **Dependency check before delete** is non-negotiable: deleting a
    village, coordinator, or category must show exact counts of what
    depends on it (users, mappings, active listings) before the action
    can proceed, with Deactivate and Reassign-then-delete offered as
    alternatives.
-   **Users Directory** is unified (one list, role badges: Buyer, Seller,
    Coordinator), not separate Farmer/Buyer tables — matches the account
    model in §3.
-   **Assign Coordinator** is a first-class flow from a user's own detail
    page, not a separate onboarding form.
-   **Audit Log** covers every module that multiple people (coordinators
    and admin) can edit — proximity mapping, categories, templates,
    roles — plus login/security events (lockouts), so any breakage or
    misuse is traceable to who changed what and when.
-   **Platform Settings** consolidates every system-wide configurable
    decision in one place: default language, voice-input toggle, max
    active listings per user, duplicate-detection toggle, digest send
    time, skip-if-empty toggle, failed-login lockout threshold, admin
    session expiry.
-   **Form validation** is consistent everywhere: required fields marked
    with a red asterisk, validation on blur (not only on submit), a
    specific inline message under the field (never a generic "invalid
    input"), and a form-level banner only after a failed submit attempt.

## 13. Database — Core Entities

Design principles for this schema, so new features/modules can be added
without breaking existing data or requiring destructive migrations:

-   Every table has a surrogate primary key (`id`), and every
    relationship below is a foreign key to that `id` — nothing is keyed
    off a human-readable field (name, phone number) so those can change
    freely later.
-   **Roles are a separate table, not boolean columns on `users`.** A new
    role in the future (e.g. a "Transport Provider" role for the deferred
    Transport module, §11) is a new row type, not a new column requiring
    a migration and a code change everywhere `users` is read.
-   **Every future module (Utility Services, Medical, Transport) gets its
    own table(s)**, following the same shape as `service_listings`,
    rather than widening a shared table — keeps existing modules
    untouched when a new one ships.
-   Deletions that need history preserved use a `deactivated_at`
    timestamp (nullable) rather than a hard delete, consistent with the
    Deactivate-vs-Delete distinction in §12.
-   All tables carry `created_at`/`updated_at`; omitted below for
    brevity but assumed throughout.

``` text
users
  ├── id (PK)
  ├── name (nullable — optional at registration)
  ├── mobile_number (unique, required)
  ├── home_village_id (FK → villages.id)
  ├── language_preference (default: mr)
  ├── session/refresh tokens
  ├── deactivated_at (nullable)
  └── deleted_at (nullable — erasure request, §15.3)

user_roles
  ├── id (PK)
  ├── user_id (FK → users.id)
  ├── role (enum: buyer | seller | coordinator | — extensible for future
  │         roles without altering the users table)
  ├── granted_by (nullable — admin/system; null for auto-earned roles
  │               like seller-on-first-listing)
  └── granted_at

villages
  ├── id (PK)
  ├── name (required)
  ├── coordinates (lat, long)
  └── deactivated_at (nullable)

village_coordinators
  ├── id (PK)
  ├── village_id (FK → villages.id)
  └── coordinator_user_id (FK → users.id)
  (many-to-many — a village may have more than one coordinator, and a
  coordinator may cover more than one village)

village_proximity_default
  ├── id (PK)
  ├── village_id (FK → villages.id)
  ├── nearby_village_id (FK → villages.id)
  ├── set_by_user_id (FK → users.id — coordinator or admin)
  └── confirmed (bool)

user_village_preference
  ├── id (PK)
  ├── user_id (FK → users.id)
  ├── added_villages [] (FK list → villages.id)
  └── removed_villages [] (FK list → villages.id)

categories
  ├── id (PK)
  ├── name (tier — e.g. Perishable, Recurring supply)
  ├── default_shelf_life
  ├── notify_mode (enum: daily_digest | change_only | weekly_digest)
  ├── default_send_time
  └── deactivated_at (nullable)

listings
  ├── id
  ├── user_id (reference → users.id — the seller)
  ├── village_id (reference → villages.id)
  ├── category_id (reference → categories.id)
  ├── item_name
  ├── normalized_item_name
  ├── quantity, unit
  ├── rate (nullable)
  ├── photo_url (nullable)
  ├── expires_at
  ├── status (enum: active | expired | sold_out)
  ├── version (integer — optimistic/offline conflict control)
  └── deactivated_at (nullable, where applicable)

interest_events
  ├── id (PK)
  ├── listing_id (FK → listings.id)
  ├── buyer_user_id (FK → users.id)
  └── created_at

notification_log
  ├── id
  ├── recipient_user_id (reference → users.id)
  ├── channel (enum: in_app | whatsapp | sms | push)
  ├── template_id (reference → message_templates.id)
  ├── language
  ├── sent_at
  └── delivery_status

consent_records
  ├── id
  ├── user_id (reference → users.id)
  ├── consent_type (notification category | marketing | service visibility)
  ├── status (granted | withdrawn)
  ├── source (registration | coordinator_assisted | in_app)
  ├── granted_at
  └── withdrawn_at (nullable)

message_templates
  ├── id (PK)
  ├── name
  ├── language
  ├── type (enum: transactional | promotional)
  ├── channel
  ├── body_text
  └── dlt_status

service_listings   (in-scope second module alongside the produce
                     marketplace, §11; template for how a further future
                     module such as Transport should get its own table
                     in this same shape rather than widening this one)
  ├── id (PK)
  ├── user_id (FK → users.id)
  ├── profession_service (main, free text)
  ├── service_category (enum: utility | medical | shop | other — used
  │                      for tile filtering and as a search field, §11.1)
  ├── keywords [] (optional, secondary skills — searchable alongside
  │               main profession and category, see §11.1)
  ├── description (optional)
  └── deactivated_at (nullable)

audit_log
  ├── id (PK)
  ├── actor_user_id (FK → users.id, nullable for system-generated
  │                  entries e.g. the 6 AM digest job)
  ├── module (e.g. proximity_mapping, categories, templates, roles,
  │           login_security)
  ├── change (human-readable description of what changed)
  └── created_at
```

### 13.1 MongoDB implementation notes

The database is implemented as MongoDB collections rather than relational SQL tables. The logical relationships specified above remain mandatory, but are represented using MongoDB document `_id` values and application-level references.

Recommended collections:

- `users`
- `user_roles`
- `villages`
- `village_coordinators`
- `village_proximity_default`
- `user_village_preference`
- `categories`
- `listings`
- `interest_events`
- `notification_log`
- `consent_records`
- `message_templates`
- `service_listings`
- `audit_log`

Recommended index/search principles:

- `users.mobile_number` — unique
- `listings.village_id + status + expires_at`
- `listings.user_id + status`
- `listings.category_id + status`
- `interest_events.listing_id + created_at`
- `service_listings.user_id`
- `village_proximity_default.village_id + nearby_village_id` — unique
- Atlas Search indexes for `item_name`, `normalized_item_name`, `profession_service`, `service_category`, and `keywords`

`village_id` is intentionally stored directly on `listings` so village-scoped discovery does not require resolving every listing through its seller's profile.

`version` on mutable offline entities supports optimistic concurrency and the conflict-resolution rules in §16.2. Server-side timestamps remain authoritative.

Hard deletes should remain rare. Where history is required, use `deactivated_at`/status fields and preserve audit history. Application services must perform dependency checks before destructive operations.

## 14. Security

-   OTP-based auth for farmer/buyer/coordinator; username+password for
    admin (no 2FA in v1.0 — see compensating controls below).
-   Session tokens in secure device storage; never phone number/OTP
    stored as the credential.
-   Rate limiting on OTP requests, resends, and admin login attempts.
-   Admin account lockout after repeated failed logins (default: 3
    attempts), logged to Audit Log.
-   Shorter session expiry for admin than for buyer/seller/coordinator
    accounts, given the sensitivity of what admin can see (every phone
    number) and change (core config, proximity mappings, templates).
-   Contact details (farmer phone/address) only ever revealed to a
    registered, verified account — never to an unauthenticated guest —
    which also limits bulk scraping.
-   No payment or financial data handled by the platform at any point.
-   Standard API-layer authorization on every protected endpoint; no
    cross-user data access beyond what a role is explicitly permitted.

## 15. Privacy and Data Protection

The platform processes personal data (names, phone numbers, village/home
location, produce listings, optional profession) subject to India's
Digital Personal Data Protection Act (DPDP), 2023, and must be designed
with privacy-by-design principles from the outset.

**Legal compliance must be validated with qualified counsel for the actual
operating model and jurisdiction.**

### 15.1 Principles

-   Data minimization — registration collects only a phone number as
    mandatory; everything else, including v1.1 professional details, is
    optional.
-   Purpose limitation — a phone number collected for produce
    notifications is not repurposed for unrelated messaging without
    separate consent.
-   Explicit opt-in for every notification category, with opt-out always
    available and honored immediately.
-   Self-declared data only for the Services Directory (§11) — no
    third-party data entry about a person without their own action.

### 15.2 Consent

Store, per consent record:

-   Consent type (notification category, marketing/promotional, service
    listing visibility).
-   Timestamp and source (guest-flow registration, coordinator-assisted
    SMS opt-in, in-app toggle).
-   Withdrawal timestamp where applicable.

Marketing/promotional consent must never be bundled invisibly into
general registration — it is a separate, visible choice (§9).

### 15.3 Data Subject Rights

The platform must support, at minimum through an admin-mediated workflow
initially:

-   Access to one's own data.
-   Correction of inaccurate data.
-   Deletion/erasure on request — distinct from routine admin
    **Deactivate**, which preserves history for reporting (§12).
-   Withdrawal of consent for any notification category.

### 15.4 Retention

-   Expired listings are retained for audit/reporting purposes, not
    permanently deleted, unless the associated user requests erasure.
-   Notification/message logs retained for a defined, configurable period
    sufficient for delivery troubleshooting and compliance evidence, not
    indefinitely by default.
-   Audit log retention should follow a defined security/compliance
    period rather than growing unbounded.

## 16. Offline and Low-Connectivity Resilience

Village users routinely face unstable internet, low bandwidth, and power
cuts. This is not an edge case to handle defensively — it is a baseline
condition the app must be designed around from the start, not retrofitted
later.

### 16.1 Principles

-   The app must remain usable, in a degraded form, with no connection at
    all — not just slow to load, but functional for the actions that
    don't strictly require a live server.
-   No user action should be silently lost because the connection dropped
    or the device lost power mid-action.
-   When connectivity returns, the device must reconcile with the server
    automatically, without the user needing to know a sync happened.

### 16.2 Local queuing and sync

``` text
User performs an action while offline (add listing, mark sold out,
relist, tap Interested, register for opt-in, etc.)
       ↓
Action is saved to a local queue on the device immediately, with a
visible "pending sync" state in the UI — never a spinner that implies
the action already reached the server
       ↓
Connectivity returns
       ↓
Queued actions are sent to the server in order, per device
       ↓
   Conflict? (e.g. listing was already marked sold out by another
   action, or expired, while offline)
       ↓
   Server applies a defined conflict rule (last-write-wins by default,
   with destructive actions like "sold out" taking precedence over a
   stale "still active" state) and the device reflects the resolved
   state, not its own stale local state
       ↓
Local queue entry cleared once server confirms receipt
```

-   Listing creation/edits, "Interested" taps, opt-in confirmations, and
    relist actions are the priority set for offline queuing in v1.0 — not
    every action needs this from day one, but these are the ones a user
    is most likely to attempt in a low-connectivity moment.
-   In-progress form data (e.g. a half-filled Add Listing form) must be
    saved locally as the user types, not only on submit — so a dropped
    connection or a power cut mid-entry does not lose their work.

### 16.3 Read access while offline

-   The most recently fetched view of Home/listings/search results is
    cached locally and shown, clearly labeled as possibly outdated (e.g.
    "Showing saved data from 7:30 AM — reconnect to refresh"), rather
    than a blank or error screen.
-   Guest browsing (§5) should similarly fall back to last-cached village
    listings where available, rather than failing outright with no
    connection.

### 16.4 Why this matters beyond the app itself

-   This is also the underlying reason the SMS/WhatsApp channel (§9)
    exists in the first place, not just the in-app experience — for a
    user without reliable data connectivity at all, SMS remains reachable
    when the app itself cannot sync. The two are complementary fallback
    layers for the same underlying constraint, not separate features.
-   The 6 AM batched digest (§9) is also naturally resilient to brief
    overnight outages, since it is a scheduled server-side job rather
    than something depending on the user's device being online at a
    precise moment.

## 17. MVP Scope

### Must have (v1.1)

-   Unified OTP registration with persistent session.
-   Guest browsing with registration gated at "Interested."
-   Village selection with geolocation default and manual override.
-   Coordinator-curated village proximity mapping (many-to-many,
    coordinator ↔ village) with admin override.
-   Category-tier listing creation with duplicate detection and flexible
    units.
-   Search (text + voice) with faded "previously available" results and
    "notify me" subscriptions.
-   Contact-reveal flow with the "notify farmer" fallback.
-   In-app instant notifications + 6 AM batched WhatsApp/SMS digest with
    skip-if-empty logic.
-   Seller tab earned on first listing; Manage tab granted by admin.
-   **Services Directory (§11)** — self-declared professions/services,
    searchable across profession, category (Utility/Medical/Shop/Other),
    and keywords (§11.1); tile-based dashboard with Marketplace and
    Services Directory as the two fully-live tiles, Transport shown as
    "Coming soon."
-   Super Admin: full CRUD across Users, Villages, Categories, Templates,
    Proximity, Reports, Flagged content, Audit Log, Platform Settings.
-   Marathi-default language support, with voice-to-text for farmer
    listing entry.
-   DLT-registered SMS templates; WhatsApp Business API integration for
    opted-in, un-saved-number delivery.
-   Offline action queuing and sync-on-reconnect for listing
    creation/edits, Interested taps, opt-in confirmation, and relist
    (§16.2); cached read access for Home/listings while offline (§16.3).

### Near-term (v1.2)

-   Promotional/re-engagement messaging module (§9).
-   CSV export on admin reports.

### Later / explicitly future

-   Transport coordination module (live-availability, not a directory).
-   In-app chat or negotiation.
-   Payments, escrow, or any money handling.
-   Ratings/reviews system.
-   Multi-admin roles with permission tiers (beyond the single
    full-rights admin model used in the pilot).

## 18. Explicit Non-Goals

Do not turn the product into:

-   A payments or e-commerce platform.
-   A logistics/delivery coordination tool.
-   A chat or messaging app.
-   A full CRM or business management suite for farmers.
-   A general classifieds site unrelated to village produce/services.
-   A verified-credentials directory (the Services Directory is
    explicitly self-declared and unverified — see §11).

## 19. Success Metrics

Primary metrics:

-   Registered users (buyers, sellers, coordinators).
-   Active listings, by category tier.
-   "Interested" clicks per listing (demand signal).
-   Contact-reveal-to-connection rate (where trackable via the "notify
    farmer" fallback usage as a proxy).
-   Relisting rate after expiry (retention/engagement proxy).
-   Buyer opt-in rate (self-registered vs. coordinator-assisted).
-   WhatsApp/SMS digest delivery success rate and cost per month.
-   Dormant-user re-engagement response rate.

The most important pilot-stage metric should become:

> **Farmer-reported successful connections per week, corroborated by
> in-app "Interested" and "notify farmer" activity.**

## 20. Product North Star

Every feature — including every future module (Services Directory,
Transport) — should be evaluated against this question:

> **"Does this help a farmer sell what they already have, or a villager
> get something they need, faster than they could without the app —
> without the app ever standing between the money changing hands?"**

If the answer is no, the feature does not automatically belong in scope.

The platform should feel **simple to a first-time smartphone user and
genuinely useful to a village with no other digital market access.**

## 21. Definition of Done

A feature is complete only when:

-   Requirement implemented.
-   Database changes complete.
-   API implemented.
-   UI implemented, including mandatory-field indicators and inline
    validation errors (§12).
-   Authorization verified (no cross-user data access beyond role).
-   Dependency check implemented for any delete action, where applicable.
-   Notification triggered where a role or state change requires one
    (§2, principle 9).
-   Error/loading/empty states handled — including the Seller-tab empty
    state and the "nothing to send" digest skip.
-   DLT/WhatsApp template approval status verified before any new
    messaging template goes live.
-   Logging/audit entry added where the action touches shared config
    (proximity mapping, categories, templates, roles).
-   For any user-initiated action in the offline-priority set (§16.2):
    offline queuing, pending-sync UI state, and reconnect behavior
    verified — not just the happy-path online case.
-   Documentation updated.

## 22. Recommended Technology Stack

The following stack is the **approved technical direction for v1.2**. It intentionally favors a small number of technologies, existing team expertise, offline-first mobile behavior, and strong compatibility with AI coding agents such as Codex.

### 22.1 Architecture style

Use a **modular monolith** for the pilot.

- One backend application.
- One primary database.
- Clearly separated domain modules.
- One mobile application for Farmer/Buyer/Coordinator.
- One Next.js application for Super Admin.
- Shared TypeScript types, validation schemas and utilities in a monorepo.
- Do **not** introduce microservices, Redis, Kafka, Elasticsearch/OpenSearch or a separate worker platform unless scale or operational evidence later requires them.

Backend modules should be separated by domain:

```text
auth
users
roles
villages
proximity
categories
listings
search
services
interests
notifications
consent
reports
audit
admin
platform-settings
```

This keeps the codebase easy for AI coding agents to understand while allowing individual modules to be extracted later if necessary.

### 22.2 Repository / monorepo

Use **npm workspaces**.

Recommended structure:

```text
gaavli/
├── apps/
│   ├── mobile/          # React Native + Expo
│   └── web/             # Next.js Admin UI + REST API + server services
│
├── packages/
│   ├── types/           # Shared TypeScript types
│   ├── validation/      # Shared Zod schemas
│   ├── constants/       # Shared enums/config constants
│   └── utils/           # Shared pure utilities
│
├── AGENTS.md
├── docs/
├── package.json
├── package-lock.json
└── tsconfig.json
```

The repository should contain concise AI-agent instructions in `AGENTS.md`, including architecture boundaries, naming conventions, testing expectations, security rules and instructions not to modify unrelated modules.

### 22.3 Mobile app — Farmer / Buyer / Coordinator

Use:

- **React Native**
- **Expo**
- **TypeScript**
- **Expo Router**
- **Zustand** for lightweight client/UI state
- **TanStack Query** for API/server-state caching
- **Expo SQLite** for offline persistence
- **NetInfo** for connectivity detection
- **Expo SecureStore** for access/refresh tokens
- **Expo Notifications / Firebase Cloud Messaging where required** for push notifications
- Device speech recognition for Marathi/Hindi/English voice input where supported

The mobile app must be designed as **offline-first**, not online-first with offline behavior added later.

### 22.4 Offline data and synchronization

Use **Expo SQLite** plus a purpose-built synchronization queue.

Required local structures should include, as appropriate:

```text
cached_villages
cached_listings
cached_search_results
draft_listings
sync_queue
local_preferences
```

The `sync_queue` should include fields such as:

```text
id
action_type
entity_type
entity_id
payload
created_at
retry_count
status
last_error
```

Required behavior:

```text
User action
    ↓
Persist locally immediately
    ↓
Show "Pending sync" when not confirmed by server
    ↓
Add action to sync queue
    ↓
Connectivity returns
    ↓
Send queued actions in order per device
    ↓
Server validates and applies conflict rules
    ↓
Server acknowledgement
    ↓
Clear queue item / update local entity
```

The queue must be idempotent so reconnect/retry cannot accidentally create duplicate listings or duplicate interest events.

The server remains authoritative. Destructive states such as `sold_out` take precedence over a stale client state as already defined in §16.2.

In-progress listing forms must be persisted locally while the user types so a power cut or connection loss does not discard entered information.

### 22.5 Backend

Use:

- **Next.js** using the **Node.js runtime** for Mongoose-backed routes
- **TypeScript**
- **Next.js Route Handlers**
- **Mongoose**
- **Zod**
- REST/JSON APIs initially

Route Handlers are thin transport adapters. Keep authentication, authorization, validation, and reusable business rules in the server-side application layer; repositories own database access. Do not access MongoDB from Mobile or Client Components. Do not replace Mobile REST endpoints with Server Actions.

Do not introduce GraphQL for the pilot. The application's API patterns are predominantly straightforward resource and action endpoints, and REST is simpler for the mobile offline queue.

### 22.6 Database

Use **MongoDB Atlas**.

MongoDB is selected because:

1. The development team already has MongoDB expertise.
2. The product has a document-friendly domain model.
3. The application does not process payments, financial ledgers or complex transactional workflows.
4. Service listings and future modules can evolve without repeatedly widening a rigid shared relational table.
5. MongoDB Atlas Search can provide the required fuzzy/typeahead search without operating a separate search cluster.
6. Atlas provides managed backups, security controls and scaling appropriate for the pilot.

The logical entities in §13 remain separate collections. References use MongoDB `_id` values rather than human-readable names or phone numbers.

### 22.7 Search

Use **MongoDB Atlas Search**.

Do not add Elasticsearch/OpenSearch for v1.2.

Produce search should support:

- typeahead/autocomplete
- typo tolerance/fuzzy matching
- normalized item names
- active listings
- previously available listings

Services search should search the union of:

```text
profession_service
service_category
keywords[]
```

This directly implements §11.1.

Search ranking should favor:

1. Exact/near-exact item or profession match.
2. Active/available results.
3. User's home/selected villages and confirmed nearby villages.
4. More recent listings.

The exact ranking weights can remain configurable/iterable after pilot feedback.

### 22.8 Authentication

For Farmer/Buyer/Coordinator:

```text
Mobile number
    ↓
OTP provider
    ↓
OTP verification
    ↓
Create/locate user
    ↓
Issue access + refresh token
    ↓
Expo SecureStore
```

Use a provider abstraction:

```typescript
interface OtpProvider {
  sendOtp(phone: string): Promise<void>;
  verifyOtp(phone: string, otp: string): Promise<boolean>;
}
```

The initial provider may be an India-focused provider or Firebase Phone Authentication, subject to cost, deliverability and onboarding validation.

The application must not permanently depend on one OTP vendor.

For Super Admin, retain the separate username/password authentication specified in §4.

### 22.9 API authorization

Every protected API endpoint must perform server-side authorization.

Recommended middleware layers:

```text
request
  ↓
authentication
  ↓
account status
  ↓
role/ownership authorization
  ↓
input validation
  ↓
business operation
  ↓
audit/event where required
```

Never rely on mobile/admin UI hiding a feature as the security boundary.

### 22.10 Admin dashboard

Use:

- **Next.js**
- **TypeScript**
- **shadcn/ui**
- **TanStack Table**
- **Zod**
- Shared packages from the monorepo

The admin application should provide reusable table/form patterns for:

```text
search
sort
filter
pagination
view
edit
deactivate
dependency-check
delete
audit
```

Do not create a separate admin backend. The Next.js admin consumes the same Next.js REST API used by the mobile application, with admin authorization.

### 22.11 File/photo storage

Listing photos must not be stored as binary data inside MongoDB.

Use:

- **Cloudflare R2** as the preferred low-cost option, or
- **AWS S3** if existing AWS infrastructure is preferred.

MongoDB stores the object key/URL and related metadata.

Images should be resized/compressed on upload to keep the mobile experience lightweight and reduce storage/bandwidth costs.

### 22.12 Notifications

Use a notification abstraction:

```text
NotificationService
    ├── InAppProvider
    ├── PushProvider
    ├── WhatsAppProvider
    └── SmsProvider
```

The listing/business modules should not directly call a WhatsApp/SMS SDK.

Notification decisions should be made centrally based on:

- consent
- notification category
- language
- channel eligibility
- digest cadence
- user activity
- opt-out state

### 22.13 SMS and WhatsApp — India

Use an India-focused CPaaS provider such as **MSG91 or Gupshup**, subject to current pricing, DLT support, WhatsApp onboarding and delivery performance at implementation time.

The provider layer must be replaceable.

All DLT and WhatsApp templates must remain stored in the `message_templates` collection with:

```text
language
channel
type
body_text
provider_template_id (where applicable)
dlt_status
active/inactive status
```

The system must never send an unapproved template.

### 22.14 Scheduled digest processing

For the pilot, do **not** introduce Redis/BullMQ unless load requires it.

Use a scheduled backend job:

```text
06:00
  ↓
Digest job
  ↓
Find opted-in users
  ↓
Find matching listings/subscriptions
  ↓
Apply category cadence
  ↓
Skip users with nothing relevant
  ↓
Build ONE combined message
  ↓
Send through eligible channel
  ↓
Write notification_log
```

The job must be idempotent so retries do not accidentally send duplicate digests.

If notification volume later justifies a dedicated queue, Redis + BullMQ can be introduced without changing the domain interfaces.

### 22.15 Voice input

Voice input should use device speech recognition where available.

Flow:

```text
Tap microphone
    ↓
Device speech recognition
    ↓
Transcribed text shown to user
    ↓
User edits if required
    ↓
Search / listing submission
```

Do not send routine voice transcription through an LLM API. This keeps the feature cheaper, faster and usable under poor connectivity.

### 22.16 Hosting

Preferred initial setup:

```text
Mobile
  └── Expo EAS

Web / Admin / API
  └── Vercel or another compatible Node.js host

Database
  └── MongoDB Atlas

Photos
  └── Cloudflare R2 / S3
```

Hosting should remain simple enough that one project manager/developer can understand the entire deployment.

### 22.17 Monitoring and diagnostics

Use **Sentry** for:

- mobile crashes
- API exceptions
- admin errors
- sync failures
- critical notification failures

The backend should also produce structured logs containing:

```text
request id
user id where appropriate
module
operation
success/failure
duration
error code
```

Do not log OTP values, access tokens, refresh tokens or unnecessary personal data.

### 22.18 Testing

Minimum automated coverage should include:

- API unit tests for business rules
- API integration tests for protected endpoints
- Zod validation tests
- duplicate listing detection tests
- offline queue tests
- sync retry/idempotency tests
- conflict-resolution tests
- notification opt-in/opt-out tests
- digest skip-if-empty tests
- authorization/ownership tests
- dependency-check tests
- critical React Native flow tests

The offline test matrix is especially important:

```text
Online → create listing → success
Offline → create listing → pending sync
Offline → edit listing → pending sync
Offline → power loss → draft recovered
Reconnect → queued action synced
Reconnect → duplicate retry → no duplicate created
Reconnect → server conflict → defined server state wins
```

### 22.19 AI coding-agent development rules

The project is intended to be developed substantially with **Codex**.

AI agents must follow these principles:

1. Read `AGENTS.md` and architecture documentation before changing code.
2. Make changes within the appropriate domain module.
3. Reuse shared types and Zod schemas.
4. Do not duplicate business rules between mobile, API and admin.
5. Do not introduce a new infrastructure dependency without justification.
6. Do not create microservices for convenience.
7. Add tests for non-trivial business rules.
8. Preserve offline behavior for all actions listed as offline-priority.
9. Never weaken server-side authorization because a UI currently hides an action.
10. Never store credentials, OTPs or tokens in plain local storage.
11. Do not silently change API contracts.
12. Update relevant documentation when architecture or API behavior changes.

### 22.20 Technology decisions intentionally deferred

The following should remain out of v1.2 unless real usage demonstrates a need:

- Redis/BullMQ
- Elasticsearch/OpenSearch
- Kafka/event streaming
- Microservices
- GraphQL
- Kubernetes
- LLM/AI runtime services
- In-app chat infrastructure
- Payment gateway
- Transport live-tracking infrastructure

The objective is to ship a reliable village pilot first, not to build infrastructure for a scale that has not yet been demonstrated.

### 22.21 Final approved stack summary

| Area | v1.2 Decision |
|---|---|
| Mobile | React Native + Expo + TypeScript |
| Navigation | Expo Router |
| Client state | Zustand |
| Server state | TanStack Query |
| Offline DB | Expo SQLite |
| Offline sync | Custom SQLite-backed queue |
| Secure storage | Expo SecureStore |
| Connectivity | NetInfo |
| Voice | Device speech recognition |
| Backend | Next.js Route Handlers + server-side application services |
| Validation | Zod |
| Database | MongoDB Atlas |
| ODM | Mongoose |
| Search | MongoDB Atlas Search |
| Admin | Next.js + TypeScript |
| Admin UI | shadcn/ui + TanStack Table |
| Shared code | `packages/types`, `packages/validation`, `packages/constants`, `packages/utils` |
| Photo storage | Cloudflare R2 / AWS S3 |
| Push | Expo Notifications / FCM |
| SMS | MSG91 / Gupshup or equivalent India-focused provider |
| WhatsApp | MSG91 / Gupshup or equivalent WhatsApp Business provider |
| Hosting | Vercel or another compatible Node.js host for the combined web/API application |
| Monitoring | Sentry |
| Architecture | Modular monolith |
| AI development | Codex |
| Runtime AI/LLM | Not required for v1.2 |

### 22.22 Architecture decision summary

The v1.2 technical architecture is intentionally optimized for:

- **Low development complexity**
- **Low infrastructure cost**
- **Existing team expertise**
- **AI coding-agent productivity**
- **Android-first village usage**
- **Poor/unstable connectivity**
- **Simple future module expansion**
- **Replaceable external service providers**
- **A clean path to scale without premature infrastructure**

The core principle is:

> **Build the smallest reliable system that can support the real village pilot; add infrastructure only when measured usage requires it.**
