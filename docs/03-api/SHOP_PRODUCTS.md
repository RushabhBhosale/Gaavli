# Shop products: "what do you sell" (in progress)

User-approved product change, 2026-11-16. Shops (`SHOP_BUSINESS` provider
profiles) say what they usually sell without listing every product, and buyers
who search for a product also see nearby shops that sell it.

## Seller flow (mobile, Shop / Business registration and edit)

1. **Shop type** (existing `shopType` master). Picking a type pre-ticks the
   product groups that type usually sells (`SHOP_TYPE_PRODUCT_GROUPS`), only
   while the seller has not chosen groups yet. Admin-added shop types have no
   suggestions.
2. **What do you sell** (`details.sells`): big tappable chips, one per product
   group (Vegetables, Fruits, Groceries, ...). Optional for older shops so their
   edits keep working; the form asks for at least one on new shops.
3. **Popular items** (`details.products`, optional): under each ticked group,
   the most common catalogue products as chips. Tap to tick. No units, prices
   or stock. At most `MAX_SHOP_PRODUCTS` codes.

Shops declare what they _usually_ have, not stock. Farmer listings remain the
only place with quantity and price.

## Data

- `ProviderProfile.details.sells: string[]`, product group ids from
  `LISTING_PRODUCT_GROUPS` (unique, at most all groups).
- `ProviderProfile.details.products: string[]`, active `ProductMaster` codes
  (unique, at most `MAX_SHOP_PRODUCTS`). The server rejects unknown or inactive
  codes with `INVALID_PRODUCT_CODE`.
- The public directory entry (`services` collection) copies them to
  `productGroups` and `productCodes`, indexed with `status`, for search.
- The directory entry DTO is unchanged (it is parsed strictly by installed
  APKs), so shop products are returned only by the new endpoint below.

## Buyer search

`GET /api/v1/directory/product-shops?sourceVillageId=...&q=tomato&limit=5`
(guest or signed in, same village visibility and contact protection as
`/api/v1/directory`, which has no rate limit; the catalogue search it runs is
not throttled here either). The server resolves `q` with the catalogue
search to its best product, then returns:

```json
{
  "product": {
    "code": "TOMATO",
    "nameEn": "Tomato",
    "nameMr": "टोमॅटो",
    "nameHi": "टमाटर",
    "productGroup": "vegetables"
  },
  "haveIt": { "entries": [/* shops that ticked TOMATO */], "total": 1 },
  "sellsGroup": {
    "entries": [/* other shops that sell vegetables */],
    "total": 8
  }
}
```

`product` is `null` (and both lists empty) when the text matches no product.
Entries use the existing `directoryEntrySchema`; guests get empty contacts.

The mobile Search All screen shows, in order: farmer listings (confirmed,
with quantity and price), "Shops that have <product>", then "<group> shops
nearby", shortened to a few rows with View all.

## Popular items

`SHOP_POPULAR_ITEMS` in `packages/constants` is generated from the catalogue
by `npm run build:shop-items --workspace=@gaavli/web -- --write` (18 per group:
the group's first six everyday items, then one from each subcategory in turn;
no varieties). Re-run after catalogue changes. The picks were not reviewed by a
person; groceries in particular lead with dry fruits rather than staples.

## Not done yet

- Not run against a database, on a device or in an emulator. Typecheck, lint
  and unit tests only (see `apps/web/tests/shop-products.test.ts`).
- Existing shops have no groups until their owner edits the profile.

- Searching the full catalogue for items beyond the popular chips.
- Showing "Sells ..." on the public shop details screen (needs a lenient,
  versioned DTO field so installed APKs keep parsing directory entries).
- Admin editing of shop-type suggestions (they are code constants today).
- "Open today" toggle.
