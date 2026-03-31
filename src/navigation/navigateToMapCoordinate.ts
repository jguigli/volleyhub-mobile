import {
  CommonActions,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';

/** Bascule sur l’onglet Carte et centre la carte sur le point donné (params lus par `MapScreen`). */
export function navigateToMapAtCoordinate(
  navigation: NavigationProp<ParamListBase>,
  lat: number,
  lng: number,
): void {
  const tabParams = {
    screen: 'Map' as const,
    params: { focusLat: lat, focusLng: lng },
  };

  const tabNav = navigation.getParent?.();
  if (tabNav) {
    (tabNav as unknown as { navigate: (name: string, p?: object) => void }).navigate(
      'MapTab',
      tabParams,
    );
    return;
  }

  navigation.dispatch(
    CommonActions.navigate({
      name: 'MapTab',
      params: tabParams,
    }),
  );
}
