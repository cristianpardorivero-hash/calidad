
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
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Catalogs, Documento, UserProfile } from "./types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";


export async function getCatalogs(hospitalId: string): Promise<Catalogs> {
  const catalogNames: (keyof Catalogs)[] = [
    "ambitos",
    "caracteristicas",
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
      where("servicioIds", "array-contains", user.servicioId)
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

export async function getLinkedDocuments(docId: string, hospitalId: string): Promise<Documento[]> {
    const docsRef = collection(db, "documents");
    const q = query(
        docsRef,
        where("hospitalId", "==", hospitalId),
        where("isDeleted", "==", false),
        where("linkedDocumentId", "==", docId)
    );

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

export async function createUserProfile(
  uid: string,
  data: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'>
): Promise<UserProfile> {
  const userRef = doc(db, 'users', uid);
  const profileData = {
    ...data,
    id: uid,
    uid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isDeleted: false,
  };
  
  await setDoc(userRef, profileData).catch(error => {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: userRef.path,
        operation: 'create',
        requestResourceData: profileData,
      })
    );
    throw error;
  });

  const newUserSnap = await getDoc(userRef);
  const newUserData = newUserSnap.data() as any;
  return {
    ...newUserData,
    uid,
    createdAt: (newUserData?.createdAt as Timestamp).toDate(),
    updatedAt: (newUserData?.updatedAt as Timestamp).toDate(),
  } as UserProfile;
}

export async function getDashboardKPIs(hospitalId: string) {
    const now = new Date();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const docsRef = collection(db, "documents");

    const allDocsQuery = query(docsRef, where("hospitalId", "==", hospitalId), where("isDeleted", "==", false));
    
    const allDocsSnap = await getDocs(allDocsQuery);

    let vigentesCount = 0;
    let proximosAVencerCount = 0;

    const docs: Documento[] = allDocsSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          fechaDocumento: (data.fechaDocumento as Timestamp)?.toDate(),
          fechaVigenciaDesde: (data.fechaVigenciaDesde as Timestamp)?.toDate(),
          fechaVigenciaHasta: (data.fechaVigenciaHasta as Timestamp)?.toDate(),
          createdAt: (data.createdAt as Timestamp)?.toDate(),
          updatedAt: (data.updatedAt as Timestamp)?.toDate(),
        } as Documento;
    });

    for (const doc of docs) {
        if (doc.estadoDocId === "est-vig") {
            vigentesCount++;
        }
        if (doc.fechaVigenciaHasta) {
            const fechaVigencia = doc.fechaVigenciaHasta;
            if (fechaVigencia > now && fechaVigencia <= sixtyDaysFromNow) {
                proximosAVencerCount++;
            }
        }
    }

    const ambitosCatalog = (await getCatalogs(hospitalId)).ambitos;

    const docsPorAmbito = docs.reduce((acc, doc) => {
        const ambito = ambitosCatalog.find(a => a.id === doc.ambitoId);
        if (ambito) {
            acc[ambito.nombre] = (acc[ambito.nombre] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    return {
        totalDocs: allDocsSnap.size,
        vigentes: vigentesCount,
        proximosAVencer: proximosAVencerCount,
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

export async function addUser(user: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt' | 'isDeleted'> & { password: string }): Promise<UserProfile> {
    const tempAppName = `user-creation-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
        const userCredential = await createUserWithEmailAndPassword(tempAuth, user.email, user.password);
        const uid = userCredential.user.uid;

        const userRef = doc(db, "users", uid);
        const { password, ...profileData } = user;
        
        const dataToSave = {
            ...profileData,
            uid: uid,
            id: uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isDeleted: false,
        };

        await setDoc(userRef, dataToSave);
        
        const newUserSnap = await getDoc(userRef);
        const data = newUserSnap.data();

        return {
            ...data,
            uid: newUserSnap.id,
            createdAt: (data?.createdAt as Timestamp)?.toDate(),
            updatedAt: (data?.updatedAt as Timestamp)?.toDate(),
        } as UserProfile;
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            throw new Error("Este correo electrónico ya está en uso.");
        }
        if (error.code === 'auth/weak-password') {
            throw new Error("La contraseña debe tener al menos 6 caracteres.");
        }
        if (error.name === 'FirebaseError') { // Firestore permission error
            throw error;
        }
        console.error("User creation error:", error);
        throw new Error("No se pudo crear el usuario. Revisa los datos e inténtalo de nuevo.");
    } finally {
        await deleteApp(tempApp);
    }
}

export async function updateUser(
  uid: string,
  updates: Partial<Omit<UserProfile, "uid" | "hospitalId" | "createdAt">>
): Promise<UserProfile> {
  const userRef = doc(db, "users", uid);
  const dataToUpdate = { ...updates, updatedAt: serverTimestamp() };
  try {
    await updateDoc(userRef, dataToUpdate);
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: userRef.path,
        operation: 'update',
        requestResourceData: dataToUpdate,
      })
    );
    throw error;
  }

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
  const collRef = collection(db, "documents");
  
  const dataToSave: any = {
    ...docData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (docData.fechaDocumento) {
    dataToSave.fechaDocumento = Timestamp.fromDate(docData.fechaDocumento);
  }
  
  if (docData.fechaVigenciaDesde) {
    dataToSave.fechaVigenciaDesde = Timestamp.fromDate(docData.fechaVigenciaDesde);
  }
  if (docData.fechaVigenciaHasta) {
    dataToSave.fechaVigenciaHasta = Timestamp.fromDate(docData.fechaVigenciaHasta);
  }

  try {
    const docRef = await addDoc(collRef, dataToSave);
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
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: collRef.path,
        operation: 'create',
        requestResourceData: dataToSave,
      })
    );
    throw error;
  }
}

export async function addCatalogItem(
  hospitalId: string,
  catalogName: keyof Catalogs,
  itemData: any
): Promise<any> {
  const collRef = collection(db, "catalogs", hospitalId, catalogName);
  const dataToSave = { ...itemData, hospitalId };
  try {
    const docRef = await addDoc(collRef, dataToSave);
    return { id: docRef.id, ...dataToSave };
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: collRef.path,
        operation: 'create',
        requestResourceData: dataToSave,
      })
    );
    throw error;
  }
}

export async function updateCatalogItem(
  hospitalId: string,
  catalogName: keyof Catalogs,
  itemId: string,
  updates: any
): Promise<any> {
  const docRef = doc(db, "catalogs", hospitalId, catalogName, itemId);
  try {
    await updateDoc(docRef, updates);
    return { id: itemId, ...updates };
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: updates,
      })
    );
    throw error;
  }
}

export async function deleteCatalogItem(
  hospitalId: string,
  catalogName: keyof Catalogs,
  itemId: string
): Promise<{ id: string }> {
  const docRef = doc(db, "catalogs", hospitalId, catalogName, itemId);
  try {
    await deleteDoc(docRef);
    return { id: itemId };
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      })
    );
    throw error;
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const userDocRef = doc(db, 'users', uid);
    try {
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
    } catch (error) {
       errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'get',
        })
      );
      throw error;
    }
}

export async function updateDocument(docId: string, updates: Partial<Documento>): Promise<void> {
  const docRef = doc(db, "documents", docId);
  
  const dataToUpdate: Record<string, any> = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  // Convert dates to Timestamps if they exist
  if (updates.fechaDocumento instanceof Date) {
    dataToUpdate.fechaDocumento = Timestamp.fromDate(updates.fechaDocumento);
  }
  if (updates.fechaVigenciaDesde instanceof Date) {
    dataToUpdate.fechaVigenciaDesde = Timestamp.fromDate(updates.fechaVigenciaDesde);
  } else if (updates.fechaVigenciaDesde === undefined) {
    dataToUpdate.fechaVigenciaDesde = null;
  }

  if (updates.fechaVigenciaHasta instanceof Date) {
    dataToUpdate.fechaVigenciaHasta = Timestamp.fromDate(updates.fechaVigenciaHasta);
  } else if (updates.fechaVigenciaHasta === undefined) {
    dataToUpdate.fechaVigenciaHasta = null;
  }

  // Re-generate search keywords from a mix of old and new data
  const originalDocSnap = await getDoc(docRef);
  const originalData = originalDocSnap.data();

  if (originalData) {
      const newTitle = updates.titulo ?? originalData.titulo;
      const newResponsable = updates.responsableNombre ?? originalData.responsableNombre;
      const newTags = updates.tags ?? originalData.tags;
      dataToUpdate.searchKeywords = [newTitle, newResponsable, ...(newTags || [])].filter(Boolean).map(kw => String(kw).toLowerCase());
  }

  // Remove fields that should not be updated from client
  const nonUpdateableFields = [
    'id', 'createdAt', 'createdByUid', 'createdByEmail', 'hospitalId', 
    'isDeleted', 'deletedAt', 'deletedByUid', 'fileName', 'fileExt', 
    'mimeType', 'fileSize', 'storagePath', 'downloadUrl', 'checksum'
  ];
  nonUpdateableFields.forEach(field => delete dataToUpdate[field]);
  
  try {
    await updateDoc(docRef, dataToUpdate);
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: dataToUpdate,
      })
    );
    throw error;
  }
}
