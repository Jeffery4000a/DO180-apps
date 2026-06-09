import { Platform } from 'react-native';
import {
  IS_ADMOB_MOCK,
  TestIds,
  BannerAdSize,
  AdEventType,
  RewardedAdEventType,
  InterstitialAd,
  RewardedAd,
  BannerAd,
} from 'react-native-google-mobile-ads';
// In Expo Go: Metro resolves this to src/utils/adsMock.js (see metro.config.js).
// In native builds: resolves to the real react-native-google-mobile-ads package.

// IS_ADMOB_MOCK is only defined in the mock; undefined in the real package.
export const ADS_AVAILABLE = !IS_ADMOB_MOCK;

// Replace placeholders with your real AdMob unit IDs before publishing.
const PROD_IDS = {
  banner:       { android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX' },
  interstitial: { android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX' },
  rewarded:     { android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX' },
};

export const AD_UNIT_IDS = {
  banner:       ADS_AVAILABLE ? (__DEV__ ? TestIds.BANNER        : PROD_IDS.banner[Platform.OS])       : '',
  interstitial: ADS_AVAILABLE ? (__DEV__ ? TestIds.INTERSTITIAL  : PROD_IDS.interstitial[Platform.OS]) : '',
  rewarded:     ADS_AVAILABLE ? (__DEV__ ? TestIds.REWARDED       : PROD_IDS.rewarded[Platform.OS])    : '',
};

export { AdEventType, RewardedAdEventType, InterstitialAd, RewardedAd, BannerAd, BannerAdSize };
