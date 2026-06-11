# Drop Merge — Ad-Monetized Puzzle Game

A cross-platform (iOS + Android) React Native/Expo merge puzzle built for retention
and ad revenue: tension timer, combo multipliers, a Gold Rush bonus stage, and
global/region/country leaderboards.

## Gameplay

- Tap a column to drop the current tile; equal tiles merge and double (2 → 2048)
- **Timer**: drains constantly (faster as your score grows); every merge buys time back
- **Combo**: consecutive merge-drops multiply scores up to ×5
- **Gold Rush**: chain merges fill a meter → 5 wildcard ★ tiles + all scores ×3
- **2048**: forming it pays a 4096 bonus and clears the tile
- Game over when the board fills or the timer hits zero

## Ad placements (Google AdMob)

| Format | Trigger |
|---|---|
| Banner | Home + Game Over screens |
| Interstitial | Every 2nd game over |
| Rewarded ×3 | Undo (after 3 free) · Bomb power-up · Continue after game over |

Ad unit IDs live in `src/utils/adConfig.js`. Test IDs are used automatically in dev builds.

## Leaderboard backend (free)

A ready-to-deploy Cloudflare Worker + D1 backend lives in `backend/`
(free plan: 100k requests/day, 5 GB DB). Deploy in ~5 minutes with
`wrangler deploy` — see `backend/README.md` — then set `API_URL` in
`src/utils/leaderboard.js`.

Caching is layered so scoreboard traffic stays nearly free:
edge cache 30s (Worker) → in-memory 60s (client) → AsyncStorage
snapshot for instant paint and offline viewing. Until a backend is
configured the app runs in offline mode against simulated players.

## Retention & fairness

- **Daily streak** 🔥 — shown on Home; first game of the day earns
  card tokens (1, or 2 at a 3-day streak, 3 at 7 days)
- **Comeback gift** — 2 tokens after 2+ days away
- **Daily reminder** — local notification at 19:00, copy escalates
  with the streak ("Your 5-day streak is on the line!")
- **Card Vault** 🎴 — draw tokens unlock 6 tile themes + 6 merge
  effects across Common/Rare/Epic/Legendary rarities (no duplicates).
  Extra tokens via rewarded ads (revenue). **Cosmetics only** — no
  item changes difficulty, scoring, timers, or odds; competition on
  the leaderboard is identical for every player.

## Development

```bash
npm install
npx expo start --clear     # Expo Go: full gameplay, ads mocked
```

AdMob is native-only; in Expo Go a Metro resolver alias (`metro.config.js`)
swaps it for `src/utils/adsMock.js`. For a native build with real ads:

1. Comment out the `resolveRequest` block in `metro.config.js`
2. Restore the `react-native-google-mobile-ads` plugin (app IDs) in `app.json`
   and add `google-services.json` / `GoogleService-Info.plist`
3. `npx expo run:android` or `eas build --platform android`

## Project structure

```
App.js                          navigation + AdMob init
src/screens/HomeScreen.js       title, stats, leaderboard entry
src/screens/GameScreen.js       core game: grid, timer, combo, Gold Rush
src/screens/GameOverScreen.js   interstitial, Continue offer, rank reveal
src/screens/LeaderboardScreen.js podium + animated global/region/country boards
src/screens/HowToPlayScreen.js  rules
src/components/                 BannerAdView, useInterstitialAd, useRewardedAd
src/utils/gameLogic.js          merge engine (pure JS, unit-testable)
src/utils/leaderboard.js        score service (offline sim / REST-ready)
src/utils/storage.js            AsyncStorage wrappers
src/utils/adConfig.js           ad unit IDs
src/utils/adsMock.js            no-op AdMob for Expo Go
```
