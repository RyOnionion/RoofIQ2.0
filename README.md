# RoofIQ UI Upgrade

Static Vercel deployment. No npm. No build step.

## Files to replace

- `index.html`
- `styles.css`
- `app.js`
- `README.md`

Keep `market-data.js` unless you intentionally want to replace the dataset.

## GitHub workflow

1. Switch to the `ui-upgrades` branch.
2. Replace the files above.
3. Commit with: `ui: upgrade dashboard experience`
4. Open the Vercel preview deployment.
5. Test map dots, filters, table rows, and city report modal.
6. Merge into `main` only after the preview works.

## Data note

The current dataset is modeled for trial UI testing. Replace with verified source-grade data before commercial use.
