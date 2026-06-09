import { Platform } from 'react-native';

// Safely import the native AdMob SDK.
// In Expo Go (development) the native module is absent — all values fall back to
// no-ops so the game runs normally without ads.
let TestIds, BannerAdSize, AdEventType, RewardedAdEventType, InterstitialAd, RewardedAd, BannerAd;
let adsAvailable = false;

try {
  const m = require('react-native-google-mobile-ads');
  TestIds             = m.TestIds;
  BannerAdSize        = m.BannerAdSize;
  AdEventType         = m.AdEventType;
  RewardedAdEventType = m.RewardedAdEventType;
  InterstitialAd      = m.InterstitialAd;
  RewardedAd          = m.RewardedAd;
  BannerAd            = m.BannerAd;
  adsAvailable = true;
} catch {}

// Replace these with your real AdMob unit IDs before publishing.
const PROD_IDS = {
  banner:       { android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX' },
  interstitial: { android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX' },
  rewarded:     { android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX' },
};

export const ADS_AVAILABLE = adsAvailable;

export const AD_UNIT_IDS = adsAvailable ? {
  banner:       __DEV__ ? TestIds.BANNER        : PROD_IDS.banner[Platform.OS],
  interstitial: __DEV__ ? TestIds.INTERSTITIAL  : PROD_IDS.interstitial[Platform.OS],
  rewarded:     __DEV__ ? TestIds.REWARDED       : PROD_IDS.rewarded[Platform.OS],
} : { banner: '', interstitial: '', rewarded: '' };

export { AdEventType, RewardedAdEventType, InterstitialAd, RewardedAd, BannerAd, BannerAdSize };
