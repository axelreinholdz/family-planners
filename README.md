# Family Planners

Local-first weekly family planner for a kitchen iPad. Swedish UI.

## Features

- **Vecka** — everyone on one week grid; large activity icons for the kids
- **Att göra** — shared checklist (swipe from the week view)
- **Hantera** — parent screen to add/edit activities and people (gear, or long-press the title)

Data stays in IndexedDB on the device. No login.

## Develop

```bash
npm install
npm run icons   # optional: regenerate PWA icons
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Install on iPad

1. Deploy or open the app in Safari on the kitchen iPad
2. Share → **Add to Home Screen**
3. Open from the home screen for fullscreen / offline use

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run icons` — generate `public/icon-*.png`
