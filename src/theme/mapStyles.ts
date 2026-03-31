import { Platform, useColorScheme } from 'react-native';
import type { MapStyleElement } from 'react-native-maps';
import { useMapAppearanceStore } from '../store/mapAppearance.store';

/**
 * Style Google Maps (Android) — carte sombre, lisible avec routes / eau.
 * @see https://developers.google.com/maps/documentation/javascript/style-reference
 */
export const GOOGLE_MAP_DARK_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#1e2836' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1e2836' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#334155' }],
  },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#1a222d' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [{ color: '#2d3a4d' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#3d4f66' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{ color: '#3d4f66' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#4a5f7a' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0b1017' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }],
  },
];

/**
 * Props pour `MapView` : thème carte selon Réglages (système / sombre / clair)
 * et `useColorScheme()` quand la préférence est « système ».
 */
export function useMapViewDarkModeProps(): {
  mapProps: {
    userInterfaceStyle: 'light' | 'dark';
    customMapStyle?: MapStyleElement[];
  };
  /** Pour `key` sur `MapView` si le style natif ne se met pas à jour (ex. Android). */
  mapThemeKey: string;
} {
  const scheme = useColorScheme();
  const preference = useMapAppearanceStore((s) => s.mapAppearance);

  const useDarkMap =
    preference === 'dark' ||
    (preference === 'system' && scheme !== 'light');

  return {
    mapProps: {
      userInterfaceStyle: useDarkMap ? 'dark' : 'light',
      ...(Platform.OS === 'android' && useDarkMap
        ? { customMapStyle: GOOGLE_MAP_DARK_STYLE }
        : {}),
    },
    mapThemeKey: `${preference}-${scheme ?? 'default'}`,
  };
}
