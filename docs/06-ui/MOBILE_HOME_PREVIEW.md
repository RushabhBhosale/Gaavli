# Database-only marketplace revision — 2026-10-14

Latest Product Details layout — 2026-10-15: large full-width 4:3 product photo,
name/price badge and label/value rows for quantity, minimum, availability date,
distance, pickup and village replace the old thumbnail/chips/options layout.
Actual expiry/standing state is displayed; missing distance/description says Not
provided. Contact/request interactions and existing theme remain intact. No
multi-photo/favourites capability or invented product description is implied.

Home layout revision — 2026-10-15: Fresh in your village cards remove category/
shelf-life chips, use larger contained photos and tighter bottom padding. A single
Marketplace and services section replaces Explore your village and contains the
Marketplace, Services, Transport and Village information cards vertically, using
the existing theme and navigation targets.

2026-10-15 Add Listing update: the add-first-product button now opens a working
database-backed form with required buyer display fields, optional local asset
photo selection and account/village-scoped saved drafts. Publishing waits for
server confirmation and refreshes buyer/owner listing queries. See
`../03-api/ADD_LISTING.md` for fields, retry behavior and remaining upload/edit work.

Settings revision: the final visible tab uses Settings/gear instead of Profile.
Its identity card has no change button; Account contains profile edit, village
change and persisted Marathi/English radio options titled Change language.
Notifications contains crop alerts
and favourite sellers/crops, followed by logout. All styling uses existing theme
tokens and selected-language copy. Village/language/logout work; profile edit,
favourites and crop notification integration remain explicitly unavailable.

Seller confirmation revision: Home opens a themed, selected-language popup with
No/Yes. Yes awaits server activation and secure persistence, then changes the
second tab to My Listings. The owner API drives the actual list/empty state;
no products yields the supplied sprout/title/first-product-button layout.
Marketplace is still accessible from Home. Add/edit forms remain pending.

Backend CRUD revision: details show saved minimum-purchase/fulfillment metadata
when returned by the API and handle standing recurring supplies without expiry.
Seller contact/notify buttons remain protected and unconnected. Seller add/edit/
My listings forms and persistent offline queues are not implemented by the server
CRUD task; see `docs/03-api/LISTING_CRUD.md`.

Product Details layout revision: compact thumbnail/name/rate row, quantity/village
chips, side-by-side (or large-text stacked) minimum-purchase/delivery panels,
seller panel and call/notify buttons. Only the selected language is shown; no
posting metadata or second-language name is displayed. Existing theme colours
remain. Missing purchase/delivery fields explicitly say not provided; absent
protected contact integration is explained and both seller actions are disabled.
No sample phone/name or assumed pickup/minimum quantity is substituted.

Latest filter/search revision: fixed All/Vegetables/Fruits/Grain/Dairy products
chips are restored using a separate database product-group filter. The search
input includes a microphone icon; tapping it explains that voice recognition is
not connected yet. No third-party dependency or recording permission is added.

Photo revision: database photo references now display in Home cards, Marketplace
cards and Product Details with a leaf placeholder on missing/failed images.
User-requested Narayangaon demo offers show a translated Demo listing badge;
details explain that images, prices and quantities are sample data. These are
stored database rows, with no automatic local fixture fallback.

Home, Marketplace and Product Details now read authenticated MongoDB-backed
listing APIs with loading/empty/error/retry and offline freshness states. Home
shows the newest five listings and database total; marketplace uses server search,
database category choices and pagination. Existing compact card layouts remain.
No sample listings, distances, photos, seller contacts or coordinator information
are used by these live screens. Missing photos use a generic leaf placeholder;
missing Marathi names use the original database name. Seller UI reads the current
database role from the listing page response. Contact requests, photo resolution,
nearby mappings, coordinator data and durable offline reads remain unfinished.
See [MOBILE_MARKETPLACE.md](../03-api/MOBILE_MARKETPLACE.md) for the actual contract.

The following preview description is historical; the revision above supersedes
its data/contact/fixture behavior for the live screens.

# Buyer dashboard preview — 2026-10-13

The user-approved dashboard is implemented with local sample marketplace content.
The existing registration-first onboarding remains connected to `/home`; the
dashboard requires a verified session and a selected village.

## Implemented UI

Compact selected-village header with coordinator information underneath and a
small Call button on the right, without a separate coordinator card. The greeting
uses the saved name with a translated Buyer/Seller badge on its right. Below are
compact horizontal Tomato/Onion/Potato/Rice/Mango cards with name/price/time/
category (seller names and available quantities removed in the 2026-10-14 revision),
Marketplace navigation with a sample 24-listing count, and Services/
Transport/Village Information navigation. The buyer-to-seller card or seller quick
actions appear at the bottom. Fixed native tabs: Home, Marketplace, My Activity,
Profile. Marathi/English uses the existing translation module.

The palette is in `apps/mobile/src/theme.ts`: #8BC34A primary, #B7DC7A soft green,
#F4F9EC light surface, #F6C94C yellow, #FFF8D8 yellow surface, #2F3A2F text,
#7A8578 secondary text, #E6EBDD border, #FFFDF7 background and white cards. Shared
buttons use dark readable text on the bright primary surface. No dark-green UI
banners or cards are introduced. Reusable components live in `components/dashboard`.

## Data and navigation boundaries

Marketplace layout revision — 2026-10-14: one full-width card per listing with a
small photo beside the product name in the selected language, price per kg and
available quantity directly below the rate. Compact cards use a small
View details button on the right of the product information and village/distance
block, with no posting-time label; Marathi
uses only Marathi action text. The action retains a 48 dp touch target. Village
lines include explicitly labelled approximate sample distance (about 4 km), which
is fixture metadata rather than distance computed from the account village or GPS.
The header shows the saved active village with village-change navigation. Crop
search matches English/Marathi names; All/Vegetables/Fruits/Grains/Milk chips
filter the labelled sample dataset locally. Milk currently has no fixture listings
and shows the translated empty-results message. Cards use existing shared Home
panels, buttons and theme colours. They show quantities already present in the
fixtures without inventing crate conversions. Sample listing villages are separate
from the signed-in user's village. This UI does not implement live global search.

The actual signed-in identity/village is combined with the explicit preview
fixtures in `src/data/mockHomeData.ts`. `HomeDashboard` accepts a typed data prop;
the fixture module can later be replaced with a validated authenticated API source.
`mockUser.isSeller` controls the preview conditional only. It does not confer real
seller capability. Removing the optional fixture coordinator does not touch buyer
or seller data. Real coordinators remain administratively assigned.

The existing Expo Router owns navigation; its Tabs wrap React Navigation. All
dashboard actions have route destinations. Product Details and Seller Contact use
the mock product ID; missing/ambiguous IDs render an unavailable state. The contact
screen is session/village gated. Mock phone numbers are labelled sample contacts;
calls open the dialer only after confirmation. Couldn't Reach does not send a fake
request. Seller creation, insights, services, transport, village information and
activity are honest future-phase previews rather than implemented backend flows.

Profile preserves SQLite language confirmation, active village change and real
server logout. Fixtures and local images render offline, but this is not a durable
listing cache or offline write queue. Native safe areas, scalable/wrapping labels
and larger tab-bar height support small screens and large system text.

## Remaining integration

Authenticated listing APIs/details and category DTOs; live capability information;
admin-assigned coordinator/contact authorization; listing creation and seller
capability; protected seller contact; interest/request persistence and consent-aware
notifications; service/transport/village-information data; durable offline reads
and queued writes where required. No backend, account migration or role mutation
is delivered by this preview task.
