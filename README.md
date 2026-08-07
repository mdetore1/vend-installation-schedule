# Vend — Installation Schedule

Standalone Gantt-style tracker for garage installations (Onboarding → Install →
Go Live per location), plus a Locations Map showing every live garage and
upcoming ("not live yet") location on a real, zoomable map.

Extracted from the main Vend onboarding dashboard project so it can be hosted
and iterated on independently.

It's front-end only — there's no backend. **All data is saved in your
browser's local storage**, so it persists across refreshes on the same
machine/browser but isn't shared between people or devices.

## Run it

Requires **Node 18+** (https://nodejs.org).

```bash
npm install
npm run dev
```

Then open the URL it prints (usually **http://localhost:5173/**).

## Build a static version

```bash
npm run build      # outputs to dist/
npm run preview    # serves the built site locally
```

The `dist/` folder is a static site — this project is set up to deploy on
Vercel with zero configuration (Vite framework preset, build command
`npm run build`, output directory `dist`).

## Notes

- Built with React + Vite + Tailwind v4. Brand tokens live in `src/index.css`.
- Map tiles are OpenStreetMap (via Leaflet) — no API key required.
- Live garage coordinates were geocoded once from street addresses and are
  baked into `src/lib/liveGarages.js`; there's no live geocoding API call at
  runtime.
