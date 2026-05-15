# Birthplace Data

The app uses a local WGS84 birthplace list at `src/data/birthplaces.mjs` for private, offline city selection in the Bazi profile picker. User selection does not call a geocoding API.

China mainland records are kept at county/district granularity and are derived from [`sfyc23/China-zip-code-latitude-and-longitude`](https://github.com/sfyc23/China-zip-code-latitude-and-longitude), licensed under MIT. Overseas seed records are maintained locally.

## Updating From GeoNames

Download these GeoNames dump files into `.cache/geonames/`:

- `cities1000.zip`
- `countryInfo.zip`
- `admin1CodesASCII.zip`

Then run:

```bash
npm run data:birthplaces
```

The generator writes `src/data/birthplaces.mjs`.

## Data Shape

The generated records keep:

- `name`
- `admin1`
- `country`
- `countryCode`
- `admin1Code`
- `lat`
- `lng`
- `population`
- `aliases`

GeoNames data is licensed under CC BY 4.0 and requires attribution: https://www.geonames.org/
