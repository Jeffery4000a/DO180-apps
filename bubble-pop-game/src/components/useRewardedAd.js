import { useEffect, useRef, useCallback, useState } from 'react';
import { ADS_AVAILABLE, RewardedAd, RewardedAdEventType, AdEventType, AD_UNIT_IDS } from '../utils/adConfig';

export default function useRewardedAd(onRewarded) {
  const adRef  = useRef(null);
  const [loaded, setLoaded] = useState(false);

  const loadAd = useCallback(() => {
    if (!ADS_AVAILABLE) return () => {};
    setLoaded(false);
    const ad = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded);
    adRef.current = ad;

    const unsubLoaded  = ad.addAdEventListener(RewardedAdEventType.LOADED,        () => setLoaded(true));
    const unsubEarned  = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => { onRewarded?.(); loadAd(); });
    const unsubClosed  = ad.addAdEventListener(AdEventType.CLOSED,                () => setLoaded(false));

    ad.load();
    return () => { unsubLoaded(); unsubEarned(); unsubClosed(); };
  }, [onRewarded]);

  useEffect(() => {
    const unsub = loadAd();
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showAd = useCallback(() => {
    if (ADS_AVAILABLE && loaded && adRef.current) adRef.current.show();
  }, [loaded]);

  return { loaded, showAd };
}
