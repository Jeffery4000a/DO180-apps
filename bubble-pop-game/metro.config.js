const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const MOCK_PATH = path.resolve(__dirname, 'src/utils/adsMock.js');

// react-native-google-mobile-ads is a native-only module — it cannot run in
// Expo Go. resolveRequest intercepts the import BEFORE Metro checks node_modules,
// so the native package is never loaded and TurboModuleRegistry never crashes.
//
// extraNodeModules (previous attempt) only adds NEW modules; it does NOT
// override a package that already exists in node_modules. resolveRequest does.
//
// To enable real AdMob in a native build (expo run:android / eas build):
//   1. Comment out the if-block below
//   2. Add back the plugin in app.json and google-services.json
//   3. Run:  npx expo run:android
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-google-mobile-ads') {
    return { filePath: MOCK_PATH, type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
