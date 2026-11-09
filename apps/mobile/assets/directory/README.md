# Services and Transport tile photos

One 600x450 photo per category tile (`src/components/dashboard/directoryGroupImages.ts`
maps the category ids). They are real photographs from Wikimedia Commons, under
CC BY, CC BY-SA or CC0; see `CREDITS.md`. The app lists the credits under
Settings, Photo credits (`src/data/photoCredits.ts`).

To replace one: crop it to 4:3 with the subject in the upper two thirds (the app
lays the tile name and count over the bottom third), save as JPEG around 600x450,
quality about 66, keep the file name, and update `CREDITS.md` and `photoCredits.ts`.
