import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, getDocFromServer } from 'firebase/firestore';
import { getDatabase, ref, set, onValue, update, remove, onDisconnect, serverTimestamp, get } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Firebase configuration from environment variables
const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate required Firebase config
const requiredEnvVars = [
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_DATABASE_ID',
  'VITE_FIREBASE_DATABASE_URL',
  'VITE_FIREBASE_STORAGE_BUCKET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('Missing required Firebase environment variables:', missingEnvVars.join(', '));
  throw new Error(`Missing required Firebase environment variables: ${missingEnvVars.join(', ')}`);
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();

export { signInWithPopup, onAuthStateChanged, signOut, doc, setDoc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, ref, set, onValue, update, remove, onDisconnect, serverTimestamp, get, storageRef as storageRef, uploadBytes, getDownloadURL, deleteObject };
