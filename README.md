# LocalRadar v2

LocalRadar v2 er en React Native app (Expo) til at opdage lokale venues og events. Den understøtter kunde- og virksomhedskonti, realtidsopdateringer og kortbaseret udforskning.

## Funktioner

- **Autentificering & Roller**: Email/password login med kunde- og virksomhedskonti
- **Realtidsdata**: Venues og events lagret i Firebase Realtime Database
- **Udforsk kort**: Google Maps visning med venues/events i nærheden og markører
- **Filtre**: Afstand, kategori og datumfiltrering for venues og events
- **Følg Venues**: Kunder kan følge venues og se relevante events
- **Virksomhedsværktøjer**: Opret/opdater venue-profiler og opret events
- **Event-detaljer**: Kapacitet, prissætning og tilmeldingsflow
- **Betalinger (Test Mode)**: Stripe test flow til betalte events
- **Notifikationer**: Expo push notifikationer og påmindelser

## Opsætning

### 1. Installer dependencies
```bash
npm install
```

### 2. Firebase opsætning (Realtime Database)
1. Gå til [Firebase Console](https://console.firebase.google.com/)
2. Opret eller vælg et projekt
3. Aktivér **Authentication** (Email/Password)
4. Opret en **Realtime Database**
5. Opret en `.env` fil i projektets rodmappe (`LocalRadar2/.env`)
6. Tilføj dine Firebase API-nøgler til `.env` filen:
7. Gem filen og start appen igen

### 3. Realtime Database regler
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "venues": {
      "$uid": {
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "events": {
      "$uid": {
        ".write": "auth != null && auth.uid == $uid"
      }
    }
  }
}
```

### 4. Stripe (Test Mode)
Stripe er konfigureret til test mode. Sæt disse environment variabler i din Expo config:

- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_STRIPE_TEST_CARD_SUCCESS` (valgfrit)
- `EXPO_PUBLIC_STRIPE_TEST_CARD_AUTH` (valgfrit)
- `EXPO_PUBLIC_STRIPE_TEST_CARD_DECLINED` (valgfrit)

### 5. Notifikationer
Notifikationer bruger Expo. Nogle funktioner kræver en fysisk enhed.

### 6. Kør appen
```
npx expo start --tunnel
```

## Projektstruktur

```
LocalRadar2/
├── App.js
├── contexts/
│   └── AuthContext.js
├── database/
│   └── firebase.js
├── screens/
│   ├── homeScreen.js
│   ├── exploreScreen.js
│   ├── BusinessScreen.js
│   ├── BusinessDetailsScreen.js
│   ├── BusinessPostWallScreen.js
│   ├── EventsScreen.js
│   ├── EventDetailsScreen.js
│   ├── PaymentScreen.js
│   ├── profileScreen.js
│   ├── LoginScreen.js
│   └── RegisterScreen.js
├── services/
│   └── NotificationService.js
├── styles/
└── assets/
```

## Brugsflow

1. **Tilmeld dig / log ind**
2. **Kunder**: gennemse venues/events, følg venues og deltag i events
3. **Virksomheder**: opret/opdater venue info og opret events
4. **Udforsk**: brug kortet og filtre til at finde venues/events i nærheden

## Tech Stack

- **React Native** + **Expo**
- **Firebase Auth** + **Realtime Database**
- **React Navigation**
- **react-native-maps** + **expo-location**
- **Stripe React Native** (test mode)
- **Expo Notifications**

## Licens


