import { useEffect, useRef, useCallback } from 'react';
import {
  InterstitialAd,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../utils/adConfig';

// Show an interstitial every N game overs to avoid over-serving.
const SHOW_EVERY = 2;

export default function useInterstitialAd() {
  const adRef = useRef(null);
  const loadedRef = useRef(false);
  const gameOverCount = useRef(0);

  const loadAd = useCallback(() => {
    const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial, {
      requestNonPersonalizedAdsOnly: false,
    });
    adRef.current = ad;
    loadedRef.current = false;

    const unsubscribe = ad.addAdEventListener(AdEventType.LOADED, () => {
      loadedRef.current = true;
    });
    ad.load();
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsub = loadAd();
    return unsub;
  }, [loadAd]);

  // Call this on every game over. It shows an ad every SHOW_EVERY calls.
  const showOnGameOver = useCallback(() => {
    gameOverCount.current += 1;
    if (gameOverCount.current % SHOW_EVERY === 0 && loadedRef.current && adRef.current) {
      adRef.current.show();
      loadAd(); // pre-load next one
    }
  }, [loadAd]);

  return { showOnGameOver };
}
