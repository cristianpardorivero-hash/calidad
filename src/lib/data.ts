import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Catalogs, Documento, UserProfile } from "./types";
import { User } from "firebase/auth";

const getCollection = <T>(...paths: string[]) =>
  collection(db, ...paths) as collection<T>;

export async function getCatalogs(hospitalId: string): Promise<Catalogs> {
  const catalogNames: (keyof Catalogs)[] = [
    "ambitos",
    "caracteristicas",
    "puntosVerificacion",
    "elementosMedibles",
    "tiposDocumento",
    "servicios",
    "estadosAcreditacionDoc",
  ];

  const catalogPromises = catalogNames.map(async (name) => {
    const collRef = collection(db, "catalogs", hospitalId, name);
    const snapshot = await getDocs(collRef);
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return [name, data];
  });

  const resolvedCatalogs = (await Promise.all(catalogPromises)) as [
    keyof Catalogs,
    any[]
  ][];

  return Object.fromEntries(resolvedCatalogs) as Catalogs;
}

export async function getDocuments(
  hospitalId: string,
  user: UserProfile
): Promise<Documento[]> {
  const docsRef = collection(db, "documents");
  let q;

  if (user.role === "lector" && user.servicioId) {
    q = query(
      docsRef,
      where("hospitalId", "==", hospitalId),
      where("isDeleted", "==", false),
      where("servicioId", "==", user.servicioId)
    );
  } else {
    q = query(
      docsRef,
      where("hospitalId", "==", hospitalId),
      where("isDeleted", "==", false)
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      // Convert Firestore Timestamps to JS Dates
      fechaDocumento: (data.fechaDocumento as Timestamp)?.toDate(),
      fechaVigenciaDesde: (data.fechaVigenciaDesde as Timestamp)?.toDate(),
      fechaVigenciaHasta: (data.fechaVigenciaHasta as Timestamp)?.toDate(),
      createdAt: (data.createdAt as Timestamp)?.toDate(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate(),
    } as Documento;
  });
}

export async function getDocumentById(
  docId: string
): Promise<Documento | undefined> {
  const docRef = doc(db, "documents", docId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      // Convert Firestore Timestamps to JS Dates
      fechaDocumento: (data.fechaDocumento as Timestamp)?.toDate(),
      fechaVigenciaDesde: (data.fechaVigenciaDesde as Timestamp)?.toDate(),
      fechaVigenciaHasta: (data.fechaVigenciaHasta as Timestamp)?.toDate(),
      createdAt: (data.createdAt as Timestamp)?.toDate(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate(),
    } as Documento;
  }
  return undefined;
}

export async function getDashboardKPIs(hospitalId: string) {
    const now = new Date();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const docsRef = collection(db, "documents");

    const totalQuery = query(docsRef, where("hospitalId", "==", hospitalId), where("isDeleted", "==", false));
    const vigentesQuery = query(docsRef, where("hospitalId", "==", hospitalId), where("isDeleted", "==", false), where("estadoDocId", "==", "est-vig"));
    const proximosQuery = query(docsRef, where("hospitalId", "==", hospitalId), where("isDeleted", "==", false), where("fechaVigenciaHasta", ">", now), where("fechaVigenciaHasta", "<=", sixtyDaysFromNow));
    
    const [totalSnap, vigentesSnap, proximosSnap] = await Promise.all([
        getDocs(totalQuery),
        getDocs(vigentesQuery),
        getDocs(proximosQuery),
    ]);

    const docs = totalSnap.docs.map(d => d.data() as Documento);
    const ambitosCatalog = (await getCatalogs(hospitalId)).ambitos;

    const docsPorAmbito = docs.reduce((acc, doc) => {
        const ambito = ambitosCatalog.find(a => a.id === doc.ambitoId);
        if (ambito) {
            acc[ambito.nombre] = (acc[ambito.nombre] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    return {
        totalDocs: totalSnap.size,
        vigentes: vigentesSnap.size,
        proximosAVencer: proximosSnap.size,
        docsPorAmbito: Object.entries(docsPorAmbito).map(([name, value]) => ({ name, value }))
    };
}

export async function getUsers(hospitalId: string): Promise<UserProfile[]> {
  const usersRef = collection(db, "users");
  const q = query(
    usersRef,
    where("hospitalId", "==", hospitalId),
    where("isDeleted", "==", false)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
        ...data,
        uid: doc.id,
        createdAt: (data.createdAt as Timestamp)?.toDate(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate(),
    } as UserProfile;
  });
}

// NOTE: Creating user accounts should be done via a backend function (Firebase Function)
// for security. This client-side version is for demonstration.
export async function addUser(user: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<UserProfile> {
    // This is insecure client-side. In a real app, use a Firebase Function.
    // We also can't create the auth user from here. This just creates the Firestore record.
    const userRef = collection(db, "users");
    const docRef = await addDoc(userRef, {
        ...user,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isDeleted: false,
    });
    
    const newUserSnap = await getDoc(docRef);
    const data = newUserSnap.data();

    return {
        ...data,
        uid: newUserSnap.id,
        createdAt: (data?.createdAt as Timestamp)?.toDate(),
        updatedAt: (data?.updatedAt as Timestamp)?.toDate(),
    } as UserProfile;
}


export async function updateUser(
  uid: string,
  updates: Partial<Omit<UserProfile, "uid" | "hospitalId" | "createdAt">>
): Promise<UserProfile> {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { ...updates, updatedAt: serverTimestamp() });
  const updatedDoc = await getDoc(userRef);
  const data = updatedDoc.data();
  return { 
      ...data,
      uid: updatedDoc.id,
      createdAt: (data?.createdAt as Timestamp)?.toDate(),
      updatedAt: (data?.updatedAt as Timestamp)?.toDate(),
    } as UserProfile;
}

export async function addDocument(docData: Omit<Documento, "id" | "createdAt" | "updatedAt">): Promise<Documento> {
  const docRef = await addDoc(collection(db, "documents"), {
    ...docData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const newDocSnap = await getDoc(docRef);
  const data = newDocSnap.data();
  return {
    id: newDocSnap.id,
    ...data,
     fechaDocumento: (data?.fechaDocumento as Timestamp)?.toDate(),
      fechaVigenciaDesde: (data?.fechaVigenciaDesde as Timestamp)?.toDate(),
      fechaVigenciaHasta: (data?.fechaVigenciaHasta as Timestamp)?.toDate(),
      createdAt: (data?.createdAt as Timestamp)?.toDate(),
      updatedAt: (data?.updatedAt as Timestamp)?.toDate(),
  } as Documento;
}


export async function addCatalogItem(
  catalogName: keyof Catalogs,
  itemData: any
): Promise<any> {
    const collRef = collection(db, "catalogs", "hcurepto", catalogName);
    const docRef = await addDoc(collRef, itemData);
    return { id: docRef.id, ...itemData };
}


export async function updateCatalogItem(
  catalogName: keyof Catalogs,
  itemId: string,
  updates: any
): Promise<any> {
  const docRef = doc(db, "catalogs", "hcurepto", catalogName, itemId);
  await updateDoc(docRef, updates);
  return { id: itemId, ...updates };
}

export async function deleteCatalogItem(
  catalogName: keyof Catalogs,
  itemId: string
): Promise<{ id: string }> {
  await deleteDoc(doc(db, "catalogs", "hcurepto", catalogName, itemId));
  return { id: itemId };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
        const data = userDoc.data();
        return {
            ...data,
            uid,
            createdAt: (data.createdAt as Timestamp)?.toDate(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate(),
        } as UserProfile;
    }
    return null;
}
