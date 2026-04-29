import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import type { Locale } from '../i18n/types';

const STORAGE_KEY = '@volleyhub:locale';

function getDeviceLocale(): Locale {
  const deviceLang = getLocales()[0]?.languageCode ?? 'fr';
  return deviceLang === 'fr' ? 'fr' : 'en';
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: getDeviceLocale(),
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ locale: state.locale }),
    },
  ),
);
