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
  let injectedConfig: FirebaseWebAppConfig = {};

  try {
    if (process.env.FIREBASE_WEBAPP_CONFIG) {
      injectedConfig = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
    }
  } catch (error) {
    console.error("Error parsing FIREBASE_WEBAPP_CONFIG:", error);
  }

  return {
    apiKey:
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
      injectedConfig.apiKey ||
      "",
    authDomain:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
      injectedConfig.authDomain ||
      "",
    projectId:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      injectedConfig.projectId ||
      "",
    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      injectedConfig.storageBucket ||
      "",
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
      injectedConfig.messagingSenderId ||
      "",
    appId:
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
      injectedConfig.appId ||
      "",
    measurementId:
      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ||
      injectedConfig.measurementId ||
      "",
  };
}

export const firebaseConfig = getFirebaseConfig();
