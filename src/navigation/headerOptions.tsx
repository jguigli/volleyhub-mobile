import React from 'react';
import { HeaderBackButton } from '@react-navigation/elements';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

type StackNav = { goBack: () => void };

/**
 * Back via HeaderBackButton: normal hit area, reduced press halo (transparent ripple / no iOS dim).
 */
export function renderHeaderBack(
  navigation: StackNav,
): NativeStackNavigationOptions['headerLeft'] {
  return (props) =>
    props.canGoBack ? (
      <HeaderBackButton
        {...props}
        onPress={() => navigation.goBack()}
        labelVisible={false}
        pressColor="transparent"
        pressOpacity={1}
      />
    ) : undefined;
}

export function withNoFeedbackHeaderBack(
  navigation: StackNav,
  base: NativeStackNavigationOptions,
): NativeStackNavigationOptions {
  return {
    ...base,
    headerLeft: renderHeaderBack(navigation),
  };
}
