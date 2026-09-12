import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

/**
 * Fail early with a message that names the fix. Without these the SDK still boots and
 * then dies on the first database call with an error that never mentions `.env`.
 */
const REQUIRED = ['apiKey', 'projectId', 'appId', 'databaseURL'] as const;
const missing = REQUIRED.filter(key => !firebaseConfig[key]);
if (missing.length > 0) {
  throw new Error(
    `Firebase is not configured: missing ${missing.join(', ')}. ` +
      'Copy the web app config from the Firebase console into .env as VITE_FIREBASE_*.'
  );
}

// Reuse the app if one exists. Initialising twice throws, which hot reload can trigger.
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

/**
 * The only backend connection the app holds.
 *
 * Posters are stored on the movie record itself, as a data URL in `posterUrl`, so there
 * is no Storage bucket to set up. This project has none: Cloud Storage requires the
 * Blaze plan on projects created after October 2024, and the bucket in `.env` answers
 * 404. Everything goes through Realtime Database instead.
 */
const database = getDatabase(app);

/**
 * Analytics is optional, loaded in its own chunk once the app is running.
 *
 * `getAnalytics` throws synchronously where it is unsupported, which includes WebViews
 * without cookie access, and it was previously called during module evaluation where
 * that would have taken the whole app down. Nothing in the app reads the instance, so
 * the import is not awaited either; first render does not wait on it.
 */
if (firebaseConfig.measurementId && typeof window !== 'undefined') {
  import('firebase/analytics')
    .then(async ({ isSupported, getAnalytics }) => {
      if (await isSupported()) getAnalytics(app);
    })
    .catch(error => console.warn('Analytics not started:', error));
}

export { app, database };
