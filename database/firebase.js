// Firebase v8 compatibility mode - ældre version der virker med React Native
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';      // Authentication service
import 'firebase/compat/database';  // Realtime Database
import 'firebase/compat/storage';   // Cloud Storage

// Firebase konfiguration - henter credentials fra environment variabler
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

// Initialiserer Firebase (kun én gang)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Eksporterer Firebase services til brug i appen
export const database = firebase.database();  // Realtime Database til data lagring
export const auth = firebase.auth();          // Authentication til login/signup
export const storage = firebase.storage();    // Storage til billeder og filer

// Konfigurerer Realtime Database for bedre performance og forbindelseshåndtering
database.goOffline(); // Starter offline
database.goOnline();  // Går derefter online for bedre connection handling

export default firebase;
