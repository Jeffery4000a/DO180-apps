import React from 'react';
import { View } from 'react-native';
import { ADS_AVAILABLE, BannerAd, BannerAdSize, AD_UNIT_IDS } from '../utils/adConfig';

export default function BannerAdView() {
  if (!ADS_AVAILABLE) {
    // Expo Go / web: reserve the same space so layout doesn't shift in production
    return <View style={{ height: 50, backgroundColor: '#0a0a1a' }} />;
  }
  return (
    <View style={{ alignItems: 'center', backgroundColor: '#0a0a1a' }}>
      <BannerAd
        unitId={AD_UNIT_IDS.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}
