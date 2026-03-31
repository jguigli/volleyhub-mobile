import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../store/auth.store';
import { useLocaleStore } from '../store/locale.store';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { colors } from '../theme';
import { navigationRef } from './rootNavigation';

const RootStack = createNativeStackNavigator();

export function AppNavigator() {
  const { token, isLoading, loadAuth } = useAuthStore();
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator key={locale} screenOptions={{ headerShown: false }}>
        {token ? (
          <RootStack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
