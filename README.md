# Family Planners

Local-first weekly family planner for a kitchen iPad. Swedish UI.

## Features

- **Vecka** — everyone on one week grid; large activity icons for the kids
- **Idag** — skärmtid, middag, nästa aktivitet, and morning routines
- **Att göra** — shared checklist
- **Hantera** — activities, återkommande mallar, rutiner, middagsmeny, skärmtid, people

Data stays in IndexedDB on the device. No login.

## Develop

```bash
npm install
npm run icons   # optional: regenerate PWA icons
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production (Vercel)

- App: https://family-planners.vercel.app  
- Project is linked to this GitHub repo — pushes to `main` deploy automatically.

## Install on iPad

1. Open https://family-planners.vercel.app in Safari on the kitchen iPad
2. Share → **Add to Home Screen**
3. Open from the home screen for fullscreen / offline use

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run icons` — generate `public/icon-*.png`
