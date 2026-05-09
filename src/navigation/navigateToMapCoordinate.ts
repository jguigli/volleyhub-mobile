import {
  CommonActions,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';

/**
 * Open the Map screen centered on the given coordinate.
 *
 * If the current stack already has a `Map` route registered (FindStack,
 * MyStack, ProfileStack, NotifStack — every stack but the dedicated MapTab),
 * we navigate within the same stack so the OS back button returns to the
 * previous screen naturally. Otherwise we fall back to switching to the
 * dedicated Map tab.
 */
export function navigateToMapAtCoordinate(
  navigation: NavigationProp<ParamListBase>,
  lat: number,
  lng: number,
): void {
  const params = { focusLat: lat, focusLng: lng };

  // Prefer in-stack navigation when the current stack has a `Map` route.
  const stackState = (navigation as any).getState?.();
  const hasMapRoute = Array.isArray(stackState?.routeNames)
    ? stackState.routeNames.includes('Map')
    : false;
  if (hasMapRoute) {
    (navigation as unknown as {
      navigate: (name: string, p?: object) => void;
    }).navigate('Map', params);
    return;
  }

  // Fallback: switch to the dedicated MapTab.
  const tabParams = { screen: 'Map' as const, params };
  const tabNav = navigation.getParent?.();
  if (tabNav) {
    (tabNav as unknown as { navigate: (name: string, p?: object) => void }).navigate(
      'MapTab',
      tabParams,
    );
    return;
  }
  navigation.dispatch(
    CommonActions.navigate({ name: 'MapTab', params: tabParams }),
  );
}
