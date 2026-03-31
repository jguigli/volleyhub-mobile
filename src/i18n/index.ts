export type { Locale } from './types';
export type { TranslationTree } from './locales/en';
export { en } from './locales/en';
export { fr } from './locales/fr';
export { translate } from './translate';
export {
  localeToBcp47,
  localeToAppleLocale,
  appleTimePickerLocale,
  prefers24HourClock,
} from './localeToBcp47';
export { useTranslation } from './useTranslation';

export const SUPPORTED_LOCALES = ['en', 'fr'] as const;
