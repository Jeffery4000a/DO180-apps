import 'react-native-google-mobile-ads';  // initialize SDK early
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';

import HomeScreen    from './src/screens/HomeScreen';
import GameScreen    from './src/screens/GameScreen';
import GameOverScreen from './src/screens/GameOverScreen';
import HowToPlayScreen from './src/screens/HowToPlayScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    // Initialize AdMob with GDPR-friendly settings.
    // In production: integrate a CMP (Consent Management Platform) for EU users.
    mobileAds()
      .initialize()
      .then(adapterStatuses => {
        console.log('AdMob initialized', adapterStatuses);
      });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{ headerShown: false, animation: 'fade' }}
        >
          <Stack.Screen name="Home"      component={HomeScreen} />
          <Stack.Screen name="Game"      component={GameScreen} />
          <Stack.Screen name="GameOver"  component={GameOverScreen} />
          <Stack.Screen name="HowToPlay" component={HowToPlayScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
