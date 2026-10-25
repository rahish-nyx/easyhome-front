import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

export const firebaseReady = Boolean(
  config.apiKey && config.projectId && config.appId,
);

export const firebaseConfig = config;

let app = null;
let auth = null;
let db = null;

if (firebaseReady) {
  app = initializeApp(config);
  auth = getAuth(app);

  // Keep the session across reloads and tabs.
  setPersistence(auth, browserLocalPersistence).catch(() => {
    /* Private mode — session-only auth is still fine. */
  });

  // Offline-first Firestore: IndexedDB cache, instant reads, multi-tab.
  // This is the modern replacement for enableIndexedDbPersistence().
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
    ignoreUndefinedProperties: true,
  });
} else if (import.meta.env.DEV) {
  console.warn(
    "[EasyHome] Firebase is not configured. Copy .env.example → .env.local and add your web app keys.",
  );
}

export { app, auth, db };
