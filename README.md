# LocalRadar v2

LocalRadar v2 is a React Native app built with Expo that helps users discover and share local venues like bars, restaurants, clubs, cafes, and pubs. This version includes Firebase integration for real-time data and user authentication.

## Features

- **User Authentication**: Sign up and log in with Firebase Auth
- **Real-time Database**: Store and retrieve venue data using Firestore
- **Venue Discovery**: Browse and search for local venues
- **Add Venues**: Users can add new venues to the database
- **Profile Management**: View your added venues and manage your profile
- **Responsive Design**: Works on both iOS and Android

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable Authentication (Email/Password)
4. Create a Firestore database
5. Get your Firebase configuration from Project Settings
6. Update `database/firebase.js` with your Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

### 3. Firestore Security Rules
Add these rules to your Firestore database:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Venues collection - authenticated users can read all, but only write their own
    match /venues/{venueId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.createdBy;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.createdBy;
    }
  }
}
```

### 4. Run the App
```bash
npm start
```

## Project Structure

```
LocalRadar2/
├── App.js                 # Main app component with navigation
├── contexts/
│   └── AuthContext.js     # Authentication context
├── database/
│   └── firebase.js        # Firebase configuration
├── screens/
│   ├── homeScreen.js      # Home screen with featured venues
│   ├── exploreScreen.js   # Explore and search venues
│   ├── profileScreen.js   # User profile and add venues
│   ├── LoginScreen.js     # User login
│   └── RegisterScreen.js  # User registration
├── styles/
│   ├── homeScreenStyles.js
│   ├── exploreScreenStyles.js
│   └── profileScreenStyles.js
└── assets/                # App icons and images
```

## How to Use

1. **Sign Up/Login**: Create an account or log in with existing credentials
2. **Browse Venues**: View featured venues on the home screen
3. **Search**: Use the explore screen to search for venues by name or location
4. **Filter**: Filter venues by category (Bar, Restaurant, Club, Cafe, Pub)
5. **Add Venues**: Go to your profile to add new venues to the database
6. **Manage**: View all venues you've added in your profile

## Technologies Used

- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and tools
- **Firebase**: Backend services (Authentication & Firestore)
- **React Navigation**: Navigation library
- **Expo Vector Icons**: Icon library

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.