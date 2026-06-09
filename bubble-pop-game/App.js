import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import HomeScreen     from './src/screens/HomeScreen';
import GameScreen     from './src/screens/GameScreen';
import GameOverScreen from './src/screens/GameOverScreen';
import HowToPlayScreen from './src/screens/HowToPlayScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    // AdMob init only works in native builds (expo run:android / eas build).
    // In Expo Go it silently skips — the game runs fine without ads in development.
    try {
      const { default: mobileAds } = require('react-native-google-mobile-ads');
      mobileAds().initialize().catch(() => {});
    } catch {}
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{ headerShown: false, animation: 'fade' }}
        >
          <Stack.Screen name="Home"       component={HomeScreen} />
          <Stack.Screen name="Game"       component={GameScreen} />
          <Stack.Screen name="GameOver"   component={GameOverScreen} />
          <Stack.Screen name="HowToPlay"  component={HowToPlayScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
