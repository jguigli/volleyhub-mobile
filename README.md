# volleyhub-mobile

Application mobile **VolleyHub** — React Native (Expo) pour organiser et rejoindre des matchs et tournois de volley.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native, Expo SDK 54, TypeScript |
| Navigation | React Navigation 7 (tabs + stacks) |
| Server state | TanStack React Query v5 |
| Local state | Zustand (auth, locale) |
| Maps | react-native-maps (Apple Maps iOS / Google Maps Android) |
| Notifications | expo-notifications + Firebase Cloud Messaging |
| Auth storage | expo-secure-store |
| i18n | Custom (FR/EN) |
| Real-time | Socket.io client |

---

## Quick Start

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- iOS Simulator (Xcode) ou Android Emulator
- Backend `volleyhub-backend` en cours d'execution

### Install & Run

```bash
npm install

# Start Expo
npm start
```

Puis `i` pour iOS Simulator ou `a` pour Android Emulator.

> Sur device physique, utiliser l'IP locale (pas `localhost`) pour `EXPO_PUBLIC_API_URL`.

### Environment

Creer un fichier `.env` :

```
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
```

---

## Project Structure

```
src/
├── api/                      # Axios API clients (auth, matches, courts, users)
├── components/               # MatchCard, MatchBottomSheet, SkillBadge, PlayerCountBadge
├── hooks/                    # React Query hooks, useSocket, useNotifications
├── i18n/                     # Translations (en.ts, fr.ts)
├── navigation/               # React Navigation (AuthNavigator, MainNavigator)
├── screens/
│   ├── MapScreen             # Carte interactive avec markers/clusters
│   ├── MatchDetailScreen     # Detail d'un match/tournoi
│   ├── MatchTeamsBoardScreen # Composition des equipes
│   ├── TournamentCourtsScreen# Bracket live, scores par terrain
│   ├── EventScoreScreen      # Saisie des scores (sets)
│   ├── MatchChatScreen       # Chat de groupe
│   ├── NotificationsScreen   # Centre de notifications (swipe-to-delete)
│   ├── ProfileScreen         # Profil + stats
│   ├── CreateMatchScreen     # Creation match/tournoi
│   ├── MyMatchesCalendarScreen# Calendrier des matchs
│   ├── LoginScreen           # Connexion
│   ├── RegisterScreen        # Inscription
│   ├── ForgotPasswordScreen  # Reset mot de passe
│   └── ...                   # Settings, Help, Search, Invite, etc.
├── store/                    # Zustand (auth.store, locale.store)
├── theme/                    # Colors, spacing, typography, map styles
├── types/                    # TypeScript interfaces
└── utils/                    # Tournament bracket, standings, display helpers
```

---

## Features

### Core
- Carte interactive avec courts et matchs (clustering au dezoom)
- Creation de matchs (classic, beach, green) avec config flexible (sets, scoring)
- Rejoindre un match en un tap sur un slot libre
- Mise a jour temps reel via WebSocket

### Tournaments
- 3 formats : elimination directe, poules + finales, round-robin
- Lancement manuel du bracket par l'organisateur
- Scoring live par terrain avec confirmation par equipe
- Override organisateur (edit + lock inline)
- Gestion forfait (equipes vides, double forfeit)

### Social
- Profils joueurs (niveau, poste, club, stats)
- Systeme follow/connexion
- Chat de groupe par match
- Invitations de joueurs

### Notifications
- Push (FCM) + in-app
- 15+ types (join, score, invitation, reminder...)
- Swipe-to-delete, tap pour naviguer

### Scoring
- Set par set pour les matchs classiques
- Point sec ou 2 points d'ecart
- Renouvellement de match (memes joueurs/regles)

---

## Scripts

```bash
npm start          # Expo dev server
npm run ios        # iOS simulator
npm run android    # Android emulator
```

---

## i18n

Langues supportees : **Francais** (defaut), **Anglais**.

Fichiers de traduction dans `src/i18n/locales/`. La langue est persistee dans Zustand (`locale.store`).
