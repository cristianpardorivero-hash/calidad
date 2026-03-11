type FirebaseWebAppConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
};

function getFirebaseConfig(): FirebaseWebAppConfig {
  const fromWebAppConfig = process.env.FIREBASE_WEBAPP_CONFIG;

  if (fromWebAppConfig) {
    try {
      // In production on App Hosting, this will be populated.
      return JSON.parse(fromWebAppConfig);
    } catch (error) {
      console.error("Error parsing FIREBASE_WEBAPP_CONFIG:", error);
    }
  }

  // Fallback for local development using .env files.
  // These variables must be set in your .env.local file.
  // The `|| ""` fallbacks have been removed to make configuration errors more explicit.
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

export const firebaseConfig = getFirebaseConfig();
