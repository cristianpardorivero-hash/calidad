'use client';

import { initializeFirebase } from '@/firebase/index';

const { firebaseApp, auth, firestore, storage } = initializeFirebase();

const app = firebaseApp;
const db = firestore;

export { app, auth, db, storage };
