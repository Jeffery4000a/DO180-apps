import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import mobileAds from 'react-native-google-mobile-ads';
// Metro resolves ^^ to adsMock.js in Expo Go, real SDK in native builds.

import HomeScreen      from './src/screens/HomeScreen';
import GameScreen      from './src/screens/GameScreen';
import GameOverScreen  from './src/screens/GameOverScreen';
import HowToPlayScreen from './src/screens/HowToPlayScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    mobileAds().initialize().catch(() => {});
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
          <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
