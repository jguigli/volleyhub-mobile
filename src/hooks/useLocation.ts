import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

const DEFAULT_LAT = 48.8566; // Paris
const DEFAULT_LNG = 2.3522; // Paris
const FORCE_DEFAULT_PARIS_LOCATION = true;

interface LocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
}

export function useLocation(): LocationState {
  const [state, setState] = useState<LocationState>({
    lat: null,
    lng: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;

    async function getLocation() {
      if (FORCE_DEFAULT_PARIS_LOCATION) {
        if (active) {
          setState({
            lat: DEFAULT_LAT,
            lng: DEFAULT_LNG,
            error: null,
            loading: false,
          });
        }
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        if (active) {
          setState({
            lat: DEFAULT_LAT,
            lng: DEFAULT_LNG,
            error: 'Location permission denied',
            loading: false,
          });
        }
        return;
      }

      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (active) {
          setState({
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            error: null,
            loading: false,
          });
        }
      } catch {
        if (active) {
          setState({
            lat: DEFAULT_LAT,
            lng: DEFAULT_LNG,
            error: 'Unable to get location',
            loading: false,
          });
        }
      }
    }

    getLocation();
    return () => { active = false; };
  }, []);

  return state;
}
