const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// react-native-google-mobile-ads is a native module — it cannot load in Expo Go.
// This alias replaces it with a no-op mock so `expo start` works for development.
//
// When you are ready for a real device build with live ads:
//   1. Comment out the extraNodeModules block below
//   2. Run:  npx expo run:android   (or eas build)
//   3. Make sure google-services.json and your real AdMob IDs are in place
config.resolver.extraNodeModules = {
  'react-native-google-mobile-ads': path.resolve(__dirname, 'src/utils/adsMock.js'),
};

module.exports = config;
