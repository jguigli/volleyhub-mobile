import { useCallback } from 'react';
import { useLocaleStore } from '../store/locale.store';
import { en } from './locales/en';
import { fr } from './locales/fr';
import { translate } from './translate';

const byLocale = { en, fr };

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const messages = byLocale[locale];

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      translate(messages, key, vars),
    [messages],
  );

  return { t, locale, setLocale };
}
