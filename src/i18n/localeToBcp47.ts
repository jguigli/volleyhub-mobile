import type { Locale } from './types';

/** English: 12 h (AM/PM). Other in-app locales: 24 h. */
export function prefers24HourClock(locale: Locale): boolean {
  return locale !== 'en';
}

export function localeToBcp47(locale: Locale): string {
  return locale === 'fr' ? 'fr-FR' : 'en-US';
}

/** `NSLocale` identifier for `UIDatePicker` (underscore form, e.g. `fr_FR`). */
export function localeToAppleLocale(locale: Locale): string {
  return locale === 'fr' ? 'fr_FR' : 'en_US';
}

/**
 * iOS time wheel: steer toward 24-hour columns vs AM/PM (best effort).
 * On Android, use `is24Hour` on `DateTimePicker` instead.
 */
export function appleTimePickerLocale(
  appLocale: Locale,
  use24Hour: boolean,
): string {
  if (use24Hour) {
    return appLocale === 'fr' ? 'fr_FR' : 'en_GB';
  }
  return 'en_US';
}
