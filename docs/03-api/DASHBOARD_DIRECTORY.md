# Shared dashboard and directory discovery — 2026-10-29

User approved the dashboard reference layout and implementation of the missing
backend discovery/contact features. This revision makes Transport a static,
available-listing directory; it does not implement dispatch, tracking or delivery.
It supersedes the earlier Transport “Coming soon” tile for this limited scope.

## Endpoints

- `GET /api/v1/dashboard?sourceVillageId=<id>` returns `coordinator`, `services`
  and `transport`. Each module has `{entries,total,page:1,limit:3}`. Marketplace
  continues to use the existing five-row Home listing API and its actual total.
- `GET /api/v1/directory?sourceVillageId=<id>&module=services|transport&search=...&page=1&limit=5`
  returns `{entries,total,page,limit}`. Module is optional. Search is literal,
  case-insensitive, bounded to 100 characters, and matches all terms across
  profession/Marathi profession, category, description and keywords. Page is
  bounded to 1–10000; limit to 1–50. Pagination and totals share the same filters.
- `GET /api/v1/directory/:id?sourceVillageId=<id>` returns one safe entry, or the
  existing 404 `LISTING_UNAVAILABLE` error for hidden/out-of-village/missing data.

All use existing optional bearer authentication, native origin checks, Node
runtime, server-only repositories, strict Zod validation and no-store JSON
envelopes. Invalid bearer headers never downgrade to guest access. Registered
accounts keep active registered-village readiness checks. The selected active
browsing village is an exact filter, as on mobile Marketplace; nearby villages
are not inferred. Inactive villages/providers, inactive/unavailable records, and
the viewer's own offers are excluded. Sorting is `createdAt DESC, _id DESC`.

Entry DTOs contain only `id,module,name,nameMr,description,category,price,unit,
village:{id,name,nameMr},createdAt`. No provider identifiers, private names,
phone numbers, addresses or credential claims are exposed. Missing prices and
units stay null. These are real database entries; missing data yields zero counts
and empty states rather than fabricated providers/vehicles or catalog rows.

## Storage and public coordinator contact

The existing documented `services` collection now has a Mongoose read model.
Required references remain `userId`, `villageId`, and the title is `profession`.
`status:ACTIVE` with `available` not false qualifies for discovery. Optional fields
are `professionMr`, `professionCode`, `serviceCategory:Utility|Medical|Shop|Other`,
`description`, `keywords`, `price`, and `unit`. Explicit `module:transport`
identifies vehicle/transport directory entries; `services` and missing historical
module values identify service entries. Unknown module values are excluded.
There is no expiry or verification claim. No existing entries are rewritten.
The village/module/status/newest and owner indexes support bounded discovery.

`VillageCoordinator.publicContactPhone` is optional, defaults to null, and accepts
only canonical `+91` Indian mobile numbers. Existing admin village create/edit
forms expose an optional public contact input. The administrator must use a number
authorized for public contact; changing the selected coordinator clears the input.
Existing version checks, admin authorization, same-origin writes, transactions and
audit logging apply. Supplying a number without an assignment is rejected. Clearing
it revokes publication. Older API clients that omit the field preserve its value
on retained assignments; a new assignment has no published number by default.

Dashboard coordinator data includes the current assigned active coordinator's
name and assigned active village. The phone comes only from this explicit public
field. The user's registered/alternative mobile is never a fallback. No assignment,
blocked coordinator or revoked coordinator role returns `coordinator:null`. A valid
assignment without a public number still shows its name/village, without a Contact
button. Public contact is identical for guests and registered viewers.

Registered-contact follow-up (2026-10-29, user approved): the explicitly configured
public number must match the assigned coordinator's current registered mobile.
Admin saves reject a different number. Public reads normalize the registered
number and publish it only when it matches the exact explicitly permitted number;
a subsequent registered-number change hides Contact until permission is updated.
Alternative mobiles and mismatched historical public numbers remain hidden.

The live-preview heading now has a green badge with the actual number of rendered
previews (for example ५ ताज्या नोंदी), replacing its View All action. Marketplace
preview prices use the same compact yellow price badge as Marketplace cards;
Services use existing light blue, Transport light green, and absent prices a
muted border-color badge. No preview count or rate is fabricated.

## Mobile behavior and limits

The shared Home renders selected-village header, optional coordinator banner,
horizontal live preview cards, and Marketplace/Services/Transport category cards.
Previews combine the existing latest five Marketplace offers and up to three
entries per directory module. Their source module determines the localized badge,
not a guessed product name/category. Marketplace badges are light yellow, Services
use the existing light blue, and Transport uses the existing light green. Card
counts use server totals. Preview selection opens Product Details or the directory
detail route as appropriate. Existing village information and role actions remain.

Both directory list routes replace their old Coming soon wrappers, with search,
five-row Show More, refresh, errors and empty states. Directory details display
the actual description, rate/unit and village; service entries are self-declared,
with a stronger Medical disclaimer. They do not add provider contact publication,
booking, payments or credential verification. This change implements discovery,
not a provider publishing/editing workflow or offline write queue.

Selected-language text uses the existing i18n system, with Devanagari digits for
Marathi category totals. User-entered content falls back to its stored original
when a translation is absent. Account and browsing-village query keys prevent
cross-scope cache reuse. Existing in-memory offline cache/warnings are retained;
cold offline launches require a connection. Persistent directory SQLite caching
is not implemented. Deploy backend before shipping the updated APK.

## Verification

`npm run test:dashboard-directory --workspace=@gaavli/web` exercises real routes
and a randomly named isolated MongoDB database, cleaned up afterward. It covers
zero/real module totals, previews, pagination, bilingual/literal search, legacy
entries, exact-village and owner exclusion, active-provider rules, DTO privacy,
public phone opt-in/revocation, coordinator status/role, no-store, auth, origin
checks and validation. Mobile tests cover module/name/nullable-field adaptation
and Marathi labels/numerals. Device/large-font/dialer and hosted acceptance remain
separate from these automated checks.
