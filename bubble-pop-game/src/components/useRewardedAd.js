import { useEffect, useRef, useCallback, useState } from 'react';
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../utils/adConfig';

export default function useRewardedAd(onRewarded) {
  const adRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  const loadAd = useCallback(() => {
    setLoaded(false);
    const ad = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded, {
      requestNonPersonalizedAdsOnly: false,
    });
    adRef.current = ad;

    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setLoaded(true);
    });
    const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      onRewarded?.();
      loadAd(); // pre-load next one
    });
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setLoaded(false);
    });

    ad.load();
    return () => { unsubLoaded(); unsubEarned(); unsubClosed(); };
  }, [onRewarded]);

  useEffect(() => {
    const unsub = loadAd();
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showAd = useCallback(() => {
    if (loaded && adRef.current) {
      adRef.current.show();
    }
  }, [loaded]);

  return { loaded, showAd };
}
