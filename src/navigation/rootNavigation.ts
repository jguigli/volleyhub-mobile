import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigateToMatchDetailFromNotification(matchId: string) {
  if (!navigationRef.isReady()) {
    return;
  }
  navigationRef.dispatch(
    CommonActions.navigate('Main', {
      screen: 'MyTab',
      params: {
        screen: 'MatchDetail',
        params: { matchId },
      },
    }),
  );
}

