import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type MapAppearancePreference = 'system' | 'dark' | 'light';

const STORAGE_KEY = '@volleyfinder:mapAppearance';

interface MapAppearanceState {
  mapAppearance: MapAppearancePreference;
  setMapAppearance: (v: MapAppearancePreference) => void;
}

export const useMapAppearanceStore = create<MapAppearanceState>()(
  persist(
    (set) => ({
      mapAppearance: 'system',
      setMapAppearance: (mapAppearance) => set({ mapAppearance }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ mapAppearance: state.mapAppearance }),
    },
  ),
);
