// No-op mock for react-native-google-mobile-ads.
// Loaded automatically in Expo Go via the metro.config.js alias.
// The game runs fully without ads during development.

export const IS_ADMOB_MOCK = true;

export const TestIds = {
  BANNER:        'ca-app-pub-mock/banner',
  INTERSTITIAL:  'ca-app-pub-mock/interstitial',
  REWARDED:      'ca-app-pub-mock/rewarded',
};

export const BannerAdSize = {
  ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER',
  BANNER: 'BANNER',
};

export const AdEventType = {
  LOADED:  'loaded',
  CLOSED:  'closed',
  ERROR:   'error',
  OPENED:  'opened',
};

export const RewardedAdEventType = {
  LOADED:        'loaded',
  EARNED_REWARD: 'earned_reward',
};

export const MaxAdContentRating = {
  G:   'G',
  PG:  'PG',
  T:   'T',
  MA:  'MA',
};

class NoOpAd {
  addAdEventListener(_type, _handler) { return () => {}; }
  load() {}
  show() {}
}

export class InterstitialAd extends NoOpAd {
  static createForAdRequest(_unitId, _opts) { return new InterstitialAd(); }
}

export class RewardedAd extends NoOpAd {
  static createForAdRequest(_unitId, _opts) { return new RewardedAd(); }
}

// BannerAd as a React component that renders nothing
export function BannerAd() { return null; }

// Default export — mobileAds() initializer
export default function mobileAds() {
  return {
    initialize:              () => Promise.resolve([]),
    setRequestConfiguration: () => Promise.resolve(),
  };
}
