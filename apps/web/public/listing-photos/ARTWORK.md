# Development listing artwork

The five WebP files under `listings/narayangaon-demo-v1` are unchanged copies of
the existing generated product photographs in `apps/mobile/assets/products`.
Exact prompts and provenance are recorded in that directory's `ARTWORK.md`.
They illustrate explicitly labelled demo listings, not real seller stock.
MongoDB stores the object keys; the development backend serves the files.
Production listing image URLs use a separately configured public R2/S3/CDN base.
