// Intl polyfills — Hermes ne fournit pas Intl.DisplayNames, on l'utilise pour
// résoudre les codes pays ISO (FR, US, …) en nom localisé (France, États-Unis, …).
// Les imports doivent être chargés AVANT le reste de l'app pour s'assurer que
// `Intl.DisplayNames` existe partout où il est utilisé.
import '@formatjs/intl-getcanonicallocales/polyfill';
import '@formatjs/intl-locale/polyfill';
import '@formatjs/intl-displaynames/polyfill';
import '@formatjs/intl-displaynames/locale-data/en';
import '@formatjs/intl-displaynames/locale-data/fr';

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
