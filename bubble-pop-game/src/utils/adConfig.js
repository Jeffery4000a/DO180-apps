import { Platform } from 'react-native';
import {
  InterstitialAd,
  RewardedAd,
  BannerAdSize,
  TestIds,
  AdEventType,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';

// Replace test IDs with your real AdMob IDs before publishing.
// Test IDs are safe to use during development and won't generate revenue.
const IDS = {
  banner: {
    android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',   // your real ID
    ios:     'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  },
  interstitial: {
    android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
    ios:     'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  },
  rewarded: {
    android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
    ios:     'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  },
};

// During development, always use Google's test IDs so you don't risk
// policy violations. Swap to IDS above in production builds.
const USE_TEST_IDS = __DEV__;

export const AD_UNIT_IDS = {
  banner:        USE_TEST_IDS ? TestIds.BANNER        : IDS.banner[Platform.OS],
  interstitial:  USE_TEST_IDS ? TestIds.INTERSTITIAL  : IDS.interstitial[Platform.OS],
  rewarded:      USE_TEST_IDS ? TestIds.REWARDED       : IDS.rewarded[Platform.OS],
};

export const BANNER_SIZE = BannerAdSize.ANCHORED_ADAPTIVE_BANNER;

// Ad revenue tips:
// - Interstitials: show after every 2-3 game overs (not every single one)
// - Rewarded:      always user-initiated (extra life, bonus time)
// - Banner:        keep visible on home & game-over screens
// - Mediation:     add ironSource/Meta Audience Network in AdMob dashboard
//                  to fill more impressions and increase eCPM
export { AdEventType, RewardedAdEventType, InterstitialAd, RewardedAd };
