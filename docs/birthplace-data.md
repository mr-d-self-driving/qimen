# Birthplace Data

The app uses a local WGS84 birthplace list at `src/data/birthplaces.mjs` for private, offline city selection in the Bazi profile picker. User selection does not call a geocoding API.

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
