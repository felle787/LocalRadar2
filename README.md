# LocalRadar v2

LocalRadar v2 is a React Native app (Expo) for discovering local venues and events. It supports customer and business accounts, real-time updates, and map-based exploration.

## Features

- **Authentication & Roles**: Email/password auth with customer and business account types
- **Realtime Data**: Venues and events stored in Firebase Realtime Database
- **Explore Map**: Google Maps view with nearby venues/events and markers
- **Filters**: Distance, category, and date filtering for venues and events
- **Follow Venues**: Customers can follow venues and see relevant events
- **Business Tools**: Create/update venue profiles and post events
- **Event Details**: Capacity, pricing, and signup flows
- **Payments (Test Mode)**: Stripe test flow for paid events
- **Notifications**: Expo push notifications and reminders

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Firebase Setup (Realtime Database)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create or select a project
3. Enable **Authentication** (Email/Password)
4. Create a **Realtime Database**
5. Update `database/firebase.js` with your Firebase config

### 3. Realtime Database Rules (example)
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
Stripe is configured for test mode. Set these environment variables in your Expo config:

- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_STRIPE_TEST_CARD_SUCCESS` (optional)
- `EXPO_PUBLIC_STRIPE_TEST_CARD_AUTH` (optional)
- `EXPO_PUBLIC_STRIPE_TEST_CARD_DECLINED` (optional)

See [STRIPE_SETUP.md](STRIPE_SETUP.md) for details.

### 5. Notifications
Notifications use Expo. Some features require a physical device. See [NOTIFICATION_FEATURES.md](NOTIFICATION_FEATURES.md) for configuration details.

### 6. Run the App
```bash
npm start
```

## Project Structure

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

## Usage Flow

1. **Sign up / log in**
2. **Customers**: browse venues/events, follow venues, and join events
3. **Businesses**: create/update venue info and post events
4. **Explore**: use the map and filters to find nearby venues/events

## Tech Stack

- **React Native** + **Expo**
- **Firebase Auth** + **Realtime Database**
- **React Navigation**
- **react-native-maps** + **expo-location**
- **Stripe React Native** (test mode)
- **Expo Notifications**

## License

MIT