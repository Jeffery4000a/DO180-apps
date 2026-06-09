import { useEffect, useRef, useCallback } from 'react';
import { ADS_AVAILABLE, InterstitialAd, AdEventType, AD_UNIT_IDS } from '../utils/adConfig';

const SHOW_EVERY = 2; // show an interstitial every N game overs

export default function useInterstitialAd() {
  const adRef       = useRef(null);
  const loadedRef   = useRef(false);
  const countRef    = useRef(0);

  const loadAd = useCallback(() => {
    if (!ADS_AVAILABLE) return () => {};
    loadedRef.current = false;
    const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);
    adRef.current = ad;
    const unsub = ad.addAdEventListener(AdEventType.LOADED, () => { loadedRef.current = true; });
    ad.load();
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = loadAd();
    return unsub;
  }, [loadAd]);

  const showOnGameOver = useCallback(() => {
    countRef.current += 1;
    if (!ADS_AVAILABLE) return;
    if (countRef.current % SHOW_EVERY === 0 && loadedRef.current && adRef.current) {
      adRef.current.show();
      loadAd();
    }
  }, [loadAd]);

  return { showOnGameOver };
}
