# Services and Transport category artwork

The dashboards use the supplied category illustrations as local WebP assets.
Illustrations use an `illustration_` filename prefix so Android resource names
are distinct from the legacy JPEG photographs. Each category has its own cropped image, with labels rendered by the app in the
selected English, Marathi or Hindi language. The 21 images total about 736 KB.

## Supplied originals

The user supplied these files in Downloads on 2026-11-13.

- `Gemini_Generated_Image_vv0i7vv0i7vv0i7v.png` supplies the text-free service scenes.
- `Gemini_Generated_Image_fpxtvtfpxtvtfpxt.png` supplies the transport scenes.
- `Gemini_Generated_Image_7r3gun7r3gun7r3g.png` supplies the tailoring/beauty icon.
- The supplied mobile mockup guides the two-column masonry layout.

## Category mapping

`src/components/dashboard/directoryGroupImages.ts` maps every existing directory
group to its illustration. Home/professional services illustrate Building &
carpentry, Education illustrates Everyday help, Social workers illustrate Other
services, Passenger transport illustrates Autos & rickshaws, Travel & tourism
illustrates Cars & taxis, and Transport support illustrates Other vehicles.
The other scenes match their corresponding directory groups directly.

The current API category identifiers, filters and counts determine which cards
appear. `DirectoryCategoryGrid.tsx` renders the independent columns, variable
artwork heights and localized text beneath each image.

The earlier Wikimedia JPEG assets and their attribution remain in `CREDITS.md`
and `src/data/photoCredits.ts`.

## Round category chips

`chip_*.webp` (160 px circles) are the artwork of the 3D icon sheet supplied on
2026-11-16, cropped without its baked-in text so the app can write the label in
the selected language. They are used for the category chips on the Services
and Transport screens (`directoryChipImage` in `directoryGroupImages.ts`);
groups without one (building, personal, other and every transport group) use
their illustration cropped to a circle. The sheet also has banks, education,
tourism, social work and religious icons, which have no category yet.
