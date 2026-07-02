import { type FirebaseApp, deleteApp, getApps, initializeApp } from 'firebase/app';
import { type Auth, getAuth } from 'firebase/auth';
import { type Firestore, getFirestore } from 'firebase/firestore';
import { type FirebaseStorage, getStorage } from 'firebase/storage';
import { type Functions, getFunctions } from 'firebase/functions';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebase Storage hasn't been enabled in the console yet. Flip to true once
// Storage is turned on and `storage.rules` is deployed - until then, upload
// UI stays disabled instead of letting users hit failed-upload errors.
export const STORAGE_ENABLED = false;

export const app: FirebaseApp = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: Functions = getFunctions(app, 'asia-southeast1');

// Creates an isolated, throwaway Firebase App instance so an admin can create
// another user's Auth account (createUserWithEmailAndPassword) without that
// call hijacking the admin's own signed-in session on the default `auth`.
export function createSecondaryAuthContext(): { auth: Auth; dispose: () => Promise<void> } {
    const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const secondaryAuth = getAuth(secondaryApp);
    return {
        auth: secondaryAuth,
        dispose: () => deleteApp(secondaryApp),
    };
}
