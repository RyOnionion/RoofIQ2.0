# RoofIQ Self-Contained Trial

Static deployable trial. No npm. No build step. No Node version settings. No external map dependency.

## Deploy

1. Unzip this folder.
2. Upload the folder contents to the GitHub repo root.
3. Vercel redeploys automatically.

## Files

- `index.html` app shell
- `styles.css` UI and map styling
- `app.js` interaction logic
- `market-data.js` modeled 50-market dataset

## Notes

This version uses a self-contained projected U.S. market canvas instead of Leaflet or Mapbox. The dataset is modeled for prototype testing. Replace with verified sourced data before selling it as source-grade intelligence.
