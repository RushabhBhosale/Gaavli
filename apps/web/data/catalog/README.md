# Gaavli master product catalog (v1)

Curated, unbranded, multilingual (English, Hindi, Marathi) product directory for
the local marketplace: 5,031 products in 43 categories and 141 subcategories.
1,131 of them are genuine varieties (for example Alphonso Mango, Indrayani Rice,
Khillar Cow) linked to a parent product with `variantOf`. Generic names only:
no brands, barcodes or packaged-SKU data.

| Scope                                                                   | Products | Pending review |
| ----------------------------------------------------------------------- | -------: | -------------: |
| Farm produce, farm inputs, livestock, plants and homemade food          |    3,376 |            328 |
| General local goods (puja, household, kitchen, clothing, hardware, ...) |    1,655 |            157 |

## Files

- `source/*.txt`: the hand-edited source. One product per line:
  `English|Hindi|Marathi|aliases|units|flags`. `@category`, `@sub` and
  `@pattern` directives are documented at the top of `scripts/build-catalog.mts`.
  Flags: `=CODE` pins a code, `^CODE` marks a variety, `?` means the native
  names or the listing need native-speaker review.
- `catalog.v1.json` (generated): categories plus products with stable
  `productCode`, `slug`, names, aliases, precomputed `searchTermsNormalized`,
  `allowedUnits`, `defaultUnit`, `variantOf`, `status` and `source`.
- `product-master.v2.json` (generated): rows in the existing Product Master
  import format, for products whose category maps to a current
  `LISTING_PRODUCT_GROUPS` value.
- `../catalog-aliases.v1.json` (generated): Hindi names and romanized aliases per
  code, read by `index:catalog-search`.
- `ambiguous-terms.v1.json` (generated): normalized terms shared by several
  products (for example `methi`), for ranking review.

Never edit generated files by hand. Rebuild after changing `source/`:

```sh
npm run build:catalog --workspace=@gaavli/web            # validate only
npm run build:catalog --workspace=@gaavli/web -- --write # regenerate outputs
npm test --workspace=@gaavli/web                         # includes catalog checks
```

The build fails on duplicate codes or English names, unknown units, categories
or variety parents, non-Devanagari native names, or a missing existing Product
Master code. `--verbose` also prints shared native names, which are usually
genuine homonyms (for example Marathi "घोळ" for purslane and a fish).

## Identity and existing data

All 151 existing Product Master codes are kept with their stored names, group
and unit, so existing listings and queued offline writes stay valid. The
importer only inserts missing codes (`$setOnInsert`), adds `nameHi` to existing
products that have none, and never touches seller listings. Codes are derived
once from the English name. After a code has been imported, pin it with
`=CODE` before renaming the product.

## Review status

Rows flagged `?` (485) are emitted as `INACTIVE` / `pending_review` and are not
selectable until an admin reviews them. Removing a flag is the review action.
Other rows are curated but have not been checked by a native speaker yet; a
Hindi and Marathi review pass before broad rollout is recommended.

## Loading into the database

All categories map to a `LISTING_PRODUCT_GROUPS` value, so all 5,031 rows are
in `product-master.v2.json`. Load and index them (dry run first, then
`--apply`), then spot-check search:

```sh
npm run import:product-master --workspace=@gaavli/web -- --file=data/catalog/product-master.v2.json --apply
npm run index:catalog-search --workspace=@gaavli/web -- --apply
npm run check:catalog-search --workspace=@gaavli/web -- tamatar कोथिंबीर hapus
```

## Provenance

Compiled for Gaavli from common Maharashtra market, nursery, agri-input and
kitchen vocabulary. Crop varieties are public agricultural-university and ICAR
release names. Crop-protection entries are generic active ingredients, not
brands or usage advice. No third-party dataset was copied.
