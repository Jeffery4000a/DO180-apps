# Bubble Pop! — Ad-Monetized Mobile Game

A hyper-casual React Native/Expo game for **iOS and Android**, built to maximize ad revenue through Google AdMob with banner, interstitial, and rewarded ad placements.

## Game Overview

- **Genre**: Hyper-casual tap game
- **Session length**: ~30–60 seconds (ideal for high ad frequency)
- **Core loop**: Pop colored bubbles → beat your high score → watch rewarded ad for bonus time → repeat

## Bubble Types

| Bubble | Points | Rarity |
|--------|--------|--------|
| ⭐ Gold   | 10 pts | 7%  |
| 🔵 Small  |  5 pts | 35% |
| 🟣 Medium |  3 pts | 35% |
| 🟠 Large  |  1 pt  | 20% |
| 💣 Bomb   | −life  | 3%  |

## Ad Monetization Strategy

### Ad Placements

| Format        | Placement                  | Typical eCPM |
|---------------|----------------------------|--------------|
| **Banner**    | Home screen + Game Over    | $0.50–$2     |
| **Interstitial** | Every 2nd game over     | $1–$5        |
| **Rewarded**  | "+15s" offer after game over | $5–$15     |

### How to Maximize Revenue

1. **Replace test IDs** in `src/utils/adConfig.js` with your real AdMob unit IDs.
2. **Add AdMob Mediation** — connect ironSource, Meta Audience Network, and AppLovin in the AdMob dashboard. Mediation fills more impressions and runs auctions to maximize eCPM.
3. **GDPR Consent** — use Google's UMP SDK (User Messaging Platform) for EU users. Required to serve personalized ads in Europe.
4. **A/B test ad frequency** — interstitials every 2 game overs is a good start; test every 3 vs every 1.
5. **Rewarded ads are your #1 earner** — the "+15 seconds" hook gives players a real reason to watch.
6. **App Store Optimization** — more installs = more DAUs = more revenue. Focus on:
   - Screenshot showing gameplay + score
   - Short, punchy description
   - 5-star review prompts after a high score

### Revenue Estimate

With 1,000 daily active users and good mediation:
- Banner: ~$2–5/day
- Interstitials: ~$10–25/day  
- Rewarded: ~$30–80/day
- **Total: ~$42–110/day** from 1K DAU

Scale to 100K DAU and you're looking at $4,000–11,000/day.

## Setup & Development

### Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [EAS CLI](https://docs.expo.dev/eas/) for building

```bash
npm install -g expo-cli eas-cli
```

### Install & Run

```bash
cd bubble-pop-game
npm install
expo start
```

Scan the QR code with **Expo Go** on your phone to see the game instantly.

> **Note**: AdMob ads require a native build (not Expo Go). Use `expo run:android` or `expo run:ios` for real ad testing.

### Building for Production

```bash
# Configure EAS (first time only)
eas build:configure

# Android (APK for testing, AAB for Play Store)
eas build --platform android --profile production

# iOS (requires Apple Developer account)
eas build --platform ios --profile production
```

### Publishing

1. **Android**: Upload the `.aab` to [Google Play Console](https://play.google.com/console)
2. **iOS**: Use `eas submit --platform ios` or upload `.ipa` via Xcode/Transporter

## Project Structure

```
bubble-pop-game/
├── App.js                        # Entry — initializes AdMob + navigation
├── app.json                      # Expo config (replace App IDs here)
├── eas.json                      # EAS Build profiles
├── src/
│   ├── screens/
│   │   ├── HomeScreen.js         # Title screen with banner ad
│   │   ├── GameScreen.js         # Core gameplay (physics loop)
│   │   ├── GameOverScreen.js     # Score + interstitial + rewarded offer
│   │   └── HowToPlayScreen.js    # Rules
│   ├── components/
│   │   ├── BannerAdView.js       # Reusable banner ad component
│   │   ├── useInterstitialAd.js  # Hook — throttled interstitial
│   │   └── useRewardedAd.js      # Hook — rewarded ad with callback
│   └── utils/
│       ├── adConfig.js           # All ad unit IDs in one place
│       ├── gameLogic.js          # Bubble spawning + physics helpers
│       └── storage.js            # AsyncStorage for high score
```

## Ad ID Configuration

Open `src/utils/adConfig.js` and replace the placeholder IDs:

```js
const IDS = {
  banner:       { android: 'ca-app-pub-XXX/YYY', ios: 'ca-app-pub-XXX/ZZZ' },
  interstitial: { android: 'ca-app-pub-XXX/YYY', ios: 'ca-app-pub-XXX/ZZZ' },
  rewarded:     { android: 'ca-app-pub-XXX/YYY', ios: 'ca-app-pub-XXX/ZZZ' },
};
```

Also update the App IDs in `app.json` under `plugins > react-native-google-mobile-ads`.

## License

MIT
