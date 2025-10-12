// Firebase v8 compat
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCthDlLnVzqsi6790mw0DjUowydveT7qXI",
  authDomain: "fir-test-b3b87.firebaseapp.com",
  projectId: "fir-test-b3b87",
  storageBucket: "fir-test-b3b87.firebasestorage.app",
  messagingSenderId: "480777430157",
  appId: "1:480777430157:web:994ce0c96fec1dd7bceec4"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Initialize Firebase services
export const db = firebase.firestore();
export const auth = firebase.auth();

export default firebase;
