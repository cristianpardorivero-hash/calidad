'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { validateFirebaseConfig } from '@/firebase/config';

const config = validateFirebaseConfig();

const app = getApps().length ? getApp() : initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
