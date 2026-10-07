
---

# `docs/06-ui/UI_UX_PRD.md`

```md
# Gaavli — UI/UX Product Requirements Document

## 1. Purpose

This document defines the complete UI/UX design requirements for the Gaavli application.

It is intended primarily for the AI UI/UX design agent, including Lovable.

The purpose of this document is to define:

- screen designs
- navigation
- layouts
- visual hierarchy
- components
- interaction patterns
- responsive behavior
- empty/loading/error states
- accessibility
- Marathi-first UX
- mobile UX
- admin dashboard UX
- design system
- clickable prototype behavior where appropriate

This document does NOT define application implementation.

---

# 2. VERY IMPORTANT — LOVABLE'S ROLE

## Lovable is a DESIGN-ONLY agent for Gaavli.

Lovable must focus on creating the visual UI/UX design and prototype of Gaavli.

Lovable is NOT responsible for implementing:

- backend
- APIs
- database
- authentication logic
- OTP implementation
- authorization
- offline synchronization
- SQLite
- server communication
- push notification infrastructure
- WhatsApp/SMS integration
- file storage
- business rules
- search implementation
- duplicate detection
- proximity calculation
- notification scheduling
- payment systems
- production deployment
- server-side validation
- security implementation
- analytics implementation
- application architecture

Codex implements the production application after the design handoff.

Therefore:

> DESIGN FIRST. IMPLEMENTATION LATER.

---

# 3. LOVABLE MUST NOT IMPLEMENT APPLICATION LOGIC

Lovable must NOT:

- create backend APIs
- create database schemas
- create API routes
- create authentication services
- implement OTP providers
- implement MongoDB
- implement SQLite
- implement offline sync
- create Next.js Route Handlers services
- create Node.js services
- create production authentication
- create production authorization
- implement notification providers
- implement WhatsApp/SMS providers
- implement cloud storage
- create payment integrations
- introduce runtime AI/LLM features
- create microservices
- introduce unnecessary libraries
- make architectural decisions
- modify the approved technical stack
- invent product requirements

If Lovable needs to represent a technical feature visually, it should create a UI representation only.

Example:

Correct:

"Show a pending sync indicator when an item has not yet synchronized."

Incorrect:

"Implement SQLite sync queue and background synchronization."

---

# 4. SOURCE OF TRUTH

Lovable must use the following documents as product/design context.

Priority:

1. `docs/01-product/PROJECT_REQUIREMENTS.md`
2. `docs/06-ui/UI_UX_PRD.md`
3. `docs/02-architecture/ARCHITECTURE.md`
4. `docs/SECURITY_PRIVACY.md`
5. `docs/OFFLINE_SYNC.md`

However, Lovable should use technical documents only to understand how the UI should represent a feature.

Lovable must NOT implement the technical architecture described in those documents.

For example:

OFFLINE_SYNC.md may define:

- PENDING
- SYNCING
- SYNCED
- FAILED
- CONFLICT

Lovable should visually represent these states.

Lovable should NOT implement the synchronization engine.

---

# 5. GAAVLI PRODUCT NORTH STAR

Gaavli connects people within a village.

Gaavli does NOT stand between them.

The product should feel:

- local
- simple
- trustworthy
- friendly
- practical
- lightweight
- community-oriented
- non-commercial
- easy for first-time smartphone users

The interface should NOT feel like:

- Amazon
- Flipkart
- LinkedIn
- Facebook
- a complex CRM
- a banking application
- an enterprise ERP

Gaavli should feel like:

> "A simple digital village notice board that helps people find each other."

---

# 6. PRIMARY DESIGN OBJECTIVES

The UI must prioritize:

1. Simplicity
2. Readability
3. Fast understanding
4. Minimal typing
5. Marathi-first experience
6. Large touch targets
7. Low cognitive load
8. Clear actions
9. Trust
10. Good performance perception on low-end Android devices
11. Usability with intermittent network
12. Accessibility for older/non-technical users

Avoid unnecessary visual complexity.

---

# 7. TARGET USERS

## 7.1 Farmer / Producer

May:

- have limited digital literacy
- use an inexpensive Android phone
- have slow/intermittent mobile internet
- prefer Marathi
- sell small quantities
- update listings occasionally

UI should therefore:

- use simple language
- minimize fields
- use large controls
- use familiar icons
- provide examples
- avoid technical terminology

---

## 7.2 Buyer

Examples:

- local resident
- shopkeeper
- restaurant
- hotel
- small business
- household

Buyer should quickly be able to:

- find products
- filter availability
- view seller
- express interest
- contact seller

---

## 7.3 Service Provider

Examples:

- electrician
- plumber
- carpenter
- mechanic
- driver
- tutor
- doctor
- other local professionals

Service providers are self-declared.

The UI must NOT imply that every service provider is officially verified.

---

## 7.4 Coordinator

Coordinator manages one or more villages.

Coordinator UI should provide:

- village management
- users
- listings
- service providers
- reports
- notification management
- basic moderation
- operational visibility

---

## 7.5 Super Admin

Super Admin manages the overall platform.

The UI should be more operational and administrative but still remain clean and simple.

---

# 8. MOBILE-FIRST DESIGN

The primary product experience is mobile.

Design primarily for:

- Android smartphones
- small screens
- low-resolution displays
- portrait orientation

Recommended design baseline:

- 360px width
- 375px width
- 390px width
- 412px width

The UI must remain usable on smaller devices.

Do not design assuming large flagship phones.

---

# 9. DESIGN LANGUAGE

Gaavli should use a modern but warm visual language.

Recommended characteristics:

- clean
- spacious
- friendly
- natural
- local
- trustworthy
- modern
- minimal

Avoid:

- excessive gradients
- glassmorphism everywhere
- excessive shadows
- overly rounded cards
- neon colors
- overly dense dashboards
- excessive animations
- decorative elements that reduce usability

---

# 10. COLOR DIRECTION

The visual identity should communicate:

- agriculture
- village
- nature
- trust
- community

Suggested visual direction:

Primary:
- deep green / agricultural green

Secondary:
- earthy / warm tones

Supporting:
- off-white / light neutral backgrounds

Status colors:

Success:
- green

Warning:
- amber/orange

Error:
- red

Information:
- blue

Colors must maintain sufficient contrast.

Do not use color alone to communicate status.

---

# 11. TYPOGRAPHY

The interface must support:

- Marathi
- Hindi
- English

Typography must remain highly readable in Devanagari.

Prefer fonts with good Devanagari support.

Typography should prioritize:

- readability
- clear hierarchy
- adequate line height
- large touch-friendly labels

Avoid very small text.

Important actions should generally use comfortable readable text rather than tiny labels.

---

# 12. LANGUAGE / LOCALIZATION

Gaavli is Marathi-first.

The design must accommodate text expansion and contraction.

Example:

English:

"Available Now"

Marathi:

"सध्या उपलब्ध"

The UI must not break when Marathi text becomes longer.

Do not hardcode layouts that only work for English.

Provide a visible language selection mechanism.

Languages:

- मराठी
- हिन्दी
- English

---

# 13. NAVIGATION

The primary mobile navigation should be simple.

Recommended bottom navigation:

1. Home
2. Explore / Search
3. Add
4. Activity
5. Profile

Do not overload bottom navigation.

Some functions may be accessed through Home or Profile.

The final navigation can be adjusted if usability testing indicates a better structure.

---

# 14. PRIMARY SCREEN INVENTORY

Lovable should design the following screens.

## Onboarding / Authentication

1. Splash
2. Language selection
3. Welcome
4. Mobile number entry
5. OTP entry
6. Profile setup
7. Village selection
8. Location/village explanation
9. Permissions explanation

---

# 15. GUEST EXPERIENCE

Users should be able to browse useful content without immediately creating an account.

Design:

- Home
- Search
- Categories
- Listing details
- Services directory

When an action requires authentication:

Show a friendly authentication prompt.

Example:

"To contact this person, please sign in."

Avoid aggressive login walls.

---

# 16. HOME SCREEN

Home is the primary village dashboard.

It should quickly answer:

> "What is available around me today?"

Recommended sections:

### Header

- village name
- language
- profile
- notification indicator

### Search

Large prominent search box.

Example:

"काय पाहिजे?"

or

"Search vegetables, milk, services..."

### Quick categories

Examples:

- Vegetables
- Fruits
- Milk & Dairy
- Flowers
- Food
- Services
- Other

### Available Today

Show currently available local listings.

### Services Nearby

Show selected services.

### Previously Available

Show items that may return.

### Notify Me

Allow users to subscribe to items they want.

Do not overload Home.

---

# 17. SEARCH SCREEN

Search must be one of the most important UX flows.

Design:

- large search input
- recent searches
- suggestions
- category suggestions
- typo-friendly result presentation
- voice search button
- filters

Search states:

1. Initial
2. Typing
3. Suggestions
4. Results
5. No results
6. Network unavailable
7. Cached results

Example:

User searches:

"टोमाटो"

System may visually suggest:

"टोमॅटो"

The UI should make correction helpful without being intrusive.

---

# 18. SEARCH RESULT CARD

Each result should communicate quickly:

- item name
- seller
- village
- quantity
- unit
- optional rate
- availability
- posted/updated time
- photo if available

Do not overload the card.

Primary action:

"Interested"

Secondary action:

"View Details"

---

# 19. LISTING DETAIL SCREEN

Show:

- item photo
- item name
- availability
- quantity
- unit
- rate if provided
- seller name
- village
- updated date/time
- seller contact action

Primary CTA:

"Interested"

Secondary CTA:

"Contact Seller"

If the seller cannot be reached:

Show:

"Notify Farmer"

Do not show unnecessary ecommerce elements.

Do NOT show:

- Add to Cart
- Checkout
- Delivery tracking
- Payment
- Order status

---

# 20. ADD LISTING

The listing creation screen must be extremely simple.

Suggested fields:

1. Item/category
2. Item name
3. Quantity
4. Unit
5. Rate — optional
6. Photo — optional
7. Availability/expiry

The form should feel achievable in under a minute.

Use:

- category shortcuts
- predefined units
- large controls
- examples
- simple language

Avoid unnecessary mandatory fields.

---

# 21. LISTING CREATED SUCCESS STATE

After creating a listing:

Show clear confirmation.

Example:

"Your listing is now visible to people nearby."

If offline:

Do NOT falsely say:

"Published successfully."

Instead show:

"Saved on your phone. It will be published when internet is available."

This is a UI representation only.

---

# 22. MY LISTINGS

Show:

- Active
- Expiring
- Expired
- Drafts
- Pending Sync
- Failed Sync

Each listing should clearly display its state.

Actions:

- Edit
- Relist
- Mark unavailable

---

# 23. OFFLINE UI

Offline behavior is a critical part of Gaavli.

Lovable must design the visual states for:

### Online

Normal UI.

### Offline

Small persistent indicator.

Example:

"You're offline"

### Pending Sync

Example:

"Waiting for internet"

### Syncing

Example:

"Updating..."

### Synced

Example:

"Updated"

### Failed

Example:

"Couldn't update"

Provide a retry action.

Do not create alarming full-screen error screens for normal temporary connectivity problems.

---

# 24. DRAFT UI

Users may start creating a listing and lose connectivity.

The draft must remain visible.

Show:

"Draft saved"

Users should be able to continue editing later.

---

# 25. SERVICES DIRECTORY

Create a dedicated Services experience.

Examples:

- Electrician
- Plumber
- Carpenter
- Mechanic
- Driver
- Tutor
- Tailor
- Doctor
- Other

Service cards:

- name
- profession
- village
- short description
- contact action

Important:

Services are self-declared.

Do NOT visually imply:

"Verified"

unless the product explicitly provides verification.

For medical services, display an appropriate disclaimer.

---

# 26. SERVICE PROFILE

Show:

- provider name
- profession
- village
- description
- contact
- availability if applicable

Keep the screen simple.

Avoid complex booking functionality.

---

# 27. INTERESTED FLOW

The "Interested" action is intentionally simple.

Design:

Button:

"Interested"

After tapping:

Show confirmation.

Example:

"Your interest has been shared."

The UI should not introduce:

- shopping cart
- order creation
- payment
- transaction workflow

---

# 28. CONTACT PRIVACY

Phone numbers should not be unnecessarily exposed throughout the UI.

Use controlled contact actions.

Example:

"Call"

"Contact"

"Notify Farmer"

Do not display phone numbers in cards unless required by the product requirements.

---

# 29. NOTIFY ME

Users can ask to be notified when an item becomes available.

Design:

Search result → Notify Me

Show:

- item
- village
- notification preference

Provide clear consent language.

Example:

"Notify me when this item becomes available."

---

# 30. NOTIFICATIONS

Create a notification center.

Categories may include:

- Listing updates
- Availability
- Interest
- Village updates
- System messages

Notification UI should be simple and readable.

WhatsApp/SMS should not be visually treated as if they are in-app messages.

---

# 31. PROFILE

Profile should contain:

- name
- mobile number
- village
- language
- my listings
- my services
- notification preferences
- privacy
- logout

Avoid unnecessary profile fields.

---

# 32. ROLE EXPERIENCE

Do not create separate completely independent accounts for:

- Buyer
- Seller
- Service Provider

The same person can perform multiple roles.

Example:

A farmer can:

- sell vegetables
- search for services
- buy products
- provide a service

The UI should support this naturally.

---

# 33. SELLER STATUS

A user becomes a seller after publishing their first listing.

Do not ask users to choose:

"I am a Seller"

during registration unless specifically required.

The UI should encourage actions rather than forcing role decisions.

---

# 34. VILLAGE SELECTION

Village selection must be extremely simple.

Hierarchy may include:

- District
- Taluka
- Village

The UI should prioritize the user's village.

If GPS is available:

GPS may be used to suggest the village.

However:

GPS should never be visually presented as absolute authority.

Provide manual selection.

---

# 35. PROXIMITY UX

The product is hyperlocal.

Users should understand that results are based on:

- their selected village
- nearby villages
- configured village relationships

Do not expose technical Haversine/GPS terminology.

Instead use human-friendly wording:

"Nearby villages"

"Available around you"

"Within your village"

---

# 36. ADMIN UI

The admin application should be designed separately from the mobile application.

Technology implementation is outside Lovable's responsibility.

Lovable should design:

### Dashboard

- total users
- active listings
- services
- villages
- notifications
- reports

### Users

- search
- filter
- status
- village
- role indicators

### Listings

- active
- expired
- reported
- deactivated

### Services

- service provider list
- profession
- village
- status

### Villages

- village mapping
- nearby village relationships

### Notifications

- notification templates
- campaign/digest preview
- consent-aware states

### Reports

- reported listing
- reported service
- user report

### Audit

Show operational history where appropriate.

---

# 37. ADMIN TABLE UX

Tables should support:

- search
- filtering
- sorting
- pagination
- loading
- empty state
- error state

On smaller screens:

Use responsive table patterns or card/list views.

Do not create horizontally unusable tables.

---

# 38. LOADING STATES

Use skeletons where useful.

Avoid:

"Loading..."

on every screen.

Loading states should preserve layout stability.

---

# 39. EMPTY STATES

Every major screen needs a meaningful empty state.

Example:

No listings:

"No products available right now."

Then provide a useful action:

"Notify me when available"

or

"Browse services"

Do not use generic:

"No data found."

---

# 40. ERROR STATES

Errors must be:

- understandable
- actionable
- non-technical

Bad:

"HTTP 409 Conflict"

Good:

"This listing was updated by someone else. Please refresh and try again."

For temporary network issues:

"Internet connection is unavailable. Your changes are saved and will sync later."

---

# 41. ACCESSIBILITY

Design for:

- older users
- low digital literacy
- poor eyesight
- small screens

Use:

- large touch targets
- readable text
- high contrast
- clear labels
- icon + text where useful
- meaningful error messages

Do not rely only on color.

---

# 42. ICONOGRAPHY

Icons should be familiar and understandable.

Prefer:

- simple outline icons
- consistent icon family
- icon + text for important actions

Avoid obscure icons.

---

# 43. BUTTON DESIGN

Primary actions must be visually obvious.

Use consistent hierarchy:

Primary:
- filled button

Secondary:
- outlined/subtle button

Tertiary:
- text/icon action

Destructive:
- visually distinct but not excessive

Avoid having multiple competing primary CTAs.

---

# 44. CARDS

Cards should be used selectively.

Avoid putting every piece of content inside a card.

Cards should help users scan information.

Avoid:

- excessive shadows
- excessive rounded corners
- unnecessary decorative elements

---

# 45. FORMS

Forms should:

- minimize fields
- use sensible defaults
- use large inputs
- show examples
- provide inline validation
- preserve entered data
- clearly mark optional fields

Do not make optional information mandatory.

---

# 46. PHOTO UX

Photos are optional.

Design:

- camera
- gallery
- preview
- remove
- replace

Do not force users to upload a photo.

If photo upload is waiting for network:

show:

"Photo waiting to upload"

Do not show false success.

---

# 47. RESPONSIVE DESIGN

The mobile application is the primary experience.

Admin UI should support:

- desktop
- tablet
- smaller laptop screens

Layouts must adapt without breaking.

---

# 48. INTERACTION PRINCIPLES

Prefer:

- one clear action per screen
- progressive disclosure
- bottom sheets where appropriate
- simple confirmation dialogs
- minimal navigation depth

Avoid:

- complex multi-step flows
- unnecessary popups
- excessive modals
- confusing nested menus

---

# 49. ANIMATION

Animation should be subtle.

Use animation only when it improves:

- understanding
- feedback
- navigation
- state transition

Avoid:

- decorative animation
- long transitions
- heavy animated backgrounds
- animation that slows down low-end devices

---

# 50. DESIGN SYSTEM

Lovable should establish a reusable design system including:

### Colors

- primary
- secondary
- background
- surface
- text
- muted text
- success
- warning
- error
- info

### Typography

- display
- heading
- body
- caption
- button

### Components

- buttons
- inputs
- dropdowns
- search
- cards
- badges
- chips
- tabs
- bottom navigation
- dialogs
- bottom sheets
- toast
- alerts
- empty states
- loading states
- skeletons

Components must remain visually consistent across screens.

---

# 51. SCREEN STATES

For important screens, Lovable should design multiple states.

At minimum:

- normal
- loading
- empty
- error
- offline
- pending sync
- success

This is especially important for:

- Home
- Search
- Listing Details
- Add Listing
- My Listings
- Services
- Notifications

---

# 52. PROTOTYPE BEHAVIOR

Lovable may create clickable prototype interactions.

Examples:

- navigation between screens
- opening listing details
- opening search
- selecting category
- opening filters
- opening profile
- showing confirmation dialogs
- showing offline states
- showing pending sync states

These interactions are for demonstrating UX only.

They must not be treated as production business logic.

---

# 53. DATA

Use realistic sample data for visual design.

Example:

"कोकणची ताजी भाजी"

"मधुकर पाटील"

"नरळे"

"5 किलो"

"₹60/kg"

However:

Do not create fake claims such as:

- verified farmer
- government verified
- guaranteed quality
- certified product

unless explicitly defined by the product requirements.

---

# 54. DESIGN FOR TRUST

Trust is extremely important.

The UI must clearly distinguish:

- user-provided information
- platform information
- verified information, if verification exists

Never visually imply verification that does not exist.

Avoid unnecessary badges.

---

# 55. SECURITY / PRIVACY UX

Lovable should represent privacy-related UI where required.

Examples:

- OTP
- permission explanation
- notification consent
- contact privacy
- logout
- account deactivation
- notification preferences
- privacy information

Do not design technical security implementation.

---

# 56. LOCATION UX

Location permission must be explained in human language.

Example:

"Gaavli uses your location to suggest nearby villages."

Provide:

- allow
- not now
- manual village selection

Users must not be blocked unnecessarily if location permission is denied.

---

# 57. NOTIFICATION PERMISSION UX

Do not immediately overwhelm users with permission prompts.

Explain the benefit first.

Example:

"Get notified when vegetables or services you are looking for become available."

Then request permission.

---

# 58. LOW-NETWORK UX

The interface should feel usable even when the network is unreliable.

Design:

- cached content indication
- offline banner
- pending changes
- retry
- sync status
- preserved drafts

Avoid making the entire application look broken because the network is temporarily unavailable.

---

# 59. DO NOT DESIGN THESE FEATURES FOR MVP

The following are intentionally outside the MVP:

- payments
- shopping cart
- checkout
- delivery management
- live transport tracking
- chat
- ratings/reviews
- complex CRM
- ecommerce order management
- wallet
- subscription billing
- complex marketplace commissions

If represented, they should be marked as:

"Future"

or

"Coming Soon"

Do not design them as active MVP functionality.

---

# 60. DESIGN HANDOFF

The final Lovable output should make it possible for another developer/AI coding agent to implement the UI.

The design should clearly communicate:

- screen hierarchy
- navigation
- component reuse
- states
- spacing
- typography
- colors
- interactions
- responsive behavior
- form behavior
- empty states
- loading states
- error states
- offline states

The implementation agent should be able to understand:

"What should this screen look like?"

without needing Lovable to implement the application logic.

---

# 61. IMPORTANT HANDOFF RULE

Codex will implement the actual application.

Lovable should therefore NOT attempt to solve implementation problems.

For example:

If the requirement says:

"Listing can be created while offline."

Lovable should design:

- offline form
- saved draft
- pending sync indicator
- success/pending states

Codex will implement:

- SQLite
- sync queue
- operationId
- API
- retry
- conflict handling

---

# 62. AI AGENT DESIGN WORKFLOW

When asked to design a feature:

1. Read the relevant product requirement.
2. Identify the required user flow.
3. Identify all important UI states.
4. Design the primary happy path.
5. Design loading/empty/error/offline states.
6. Check Marathi/English text fit.
7. Check small-screen usability.
8. Reuse existing design components.
9. Avoid introducing unnecessary patterns.
10. Do not implement application logic.

---

# 63. DO NOT INVENT REQUIREMENTS

Lovable must not invent:

- new business rules
- new user roles
- new payment models
- new pricing
- new verification mechanisms
- new workflows
- new backend capabilities
- new data requirements

If something is ambiguous:

Use the simplest UI interpretation that does not conflict with the product requirements.

For high-impact ambiguity, ask for clarification.

---

# 64. DO NOT CHANGE THE PRODUCT SCOPE

The UI design must follow the approved MVP scope.

Do not add features simply because they are common in marketplace applications.

Gaavli is intentionally lightweight.

---

# 65. VISUAL PRIORITY

When deciding between:

A. More features

and

B. Simpler UX

Choose:

> Simpler UX.

When deciding between:

A. More information

and

B. Faster understanding

Choose:

> Faster understanding.

When deciding between:

A. Technical terminology

and

B. Village-friendly language

Choose:

> Village-friendly language.

---

# 66. LOVABLE OUTPUT EXPECTATION

Lovable should produce:

- complete screen designs
- reusable UI components
- responsive layouts
- mobile-first designs
- admin dashboard designs
- all important states
- clickable prototype interactions where useful
- realistic sample data
- consistent visual system
- design suitable for developer handoff

Lovable should NOT produce:

- backend code
- API implementation
- database implementation
- authentication implementation
- offline sync implementation
- production business logic
- infrastructure
- deployment configuration

---

# 67. DEFINITION OF DONE — LOVABLE

The UI/UX work is considered complete when:

### Design

- [ ] All MVP screens are designed.
- [ ] Navigation is defined.
- [ ] Mobile-first layouts are complete.
- [ ] Admin screens are designed.
- [ ] Design system is consistent.
- [ ] Marathi-first layouts are checked.

### States

- [ ] Loading states exist.
- [ ] Empty states exist.
- [ ] Error states exist.
- [ ] Offline states exist.
- [ ] Pending sync states exist.
- [ ] Success states exist.

### UX

- [ ] User flows are understandable.
- [ ] Important actions are obvious.
- [ ] Forms are simple.
- [ ] Low-tech users can understand the interface.
- [ ] Contact/privacy behavior is represented.
- [ ] Notification consent UX is represented.

### Responsiveness

- [ ] 360px mobile width works.
- [ ] 375px works.
- [ ] 390px works.
- [ ] 412px works.
- [ ] Admin desktop layout works.

### Handoff

- [ ] Components are reusable.
- [ ] Screen hierarchy is clear.
- [ ] Navigation is clear.
- [ ] UI states are clear.
- [ ] No unexplained business logic exists in the design.

---

# 68. FINAL LOVABLE RULE

The most important instruction for the Lovable agent is:

> **You are the UI/UX designer for Gaavli, not the application developer.**

Design the experience.

Design the screens.

Design the interactions.

Design all important states.

Make the product simple enough for a village user.

Do NOT implement the application architecture or business logic.

Codex will implement the application later using the approved architecture and technical documentation.

---

# GAAVLI UI/UX NORTH STAR

> "If a farmer who is not comfortable with smartphones can open Gaavli and understand what to do within a few seconds, the UI is doing its job."
```
