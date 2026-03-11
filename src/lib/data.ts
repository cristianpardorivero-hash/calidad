

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
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/firebase/client";
import type { Catalogs, Documento, UserProfile, DocumentVersion, UserRole, LibraryDocument } from "./types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";

const safeToDate = (timestamp: any): Date | undefined => {
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    return undefined;
};

const safeToDateRequired = (timestamp: any, fallbackDate = new Date(0)): Date => {
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    return fallbackDate;
};


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
  userRole?: UserRole,
  userServicioIds?: string[]
): Promise<Documento[]> {
  const docsRef = collection(db, "documents");
  let q;

  if (userRole === "lector" && userServicioIds && userServicioIds.length > 0) {
    q = query(
      docsRef,
      where("hospitalId", "==", hospitalId),
      where("isDeleted", "==", false),
      where("servicioIds", "array-contains-any", userServicioIds)
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
      fechaDocumento: safeToDateRequired(data.fechaDocumento),
      fechaVigenciaDesde: safeToDate(data.fechaVigenciaDesde),
      fechaVigenciaHasta: safeToDate(data.fechaVigenciaHasta),
      createdAt: safeToDateRequired(data.createdAt),
      updatedAt: safeToDateRequired(data.updatedAt),
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
      fechaDocumento: safeToDateRequired(data.fechaDocumento),
      fechaVigenciaDesde: safeToDate(data.fechaVigenciaDesde),
      fechaVigenciaHasta: safeToDate(data.fechaVigenciaHasta),
      createdAt: safeToDateRequired(data.createdAt),
      updatedAt: safeToDateRequired(data.updatedAt),
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
            fechaDocumento: safeToDateRequired(data.fechaDocumento),
            fechaVigenciaDesde: safeToDate(data.fechaVigenciaDesde),
            fechaVigenciaHasta: safeToDate(data.fechaVigenciaHasta),
            createdAt: safeToDateRequired(data.createdAt),
            updatedAt: safeToDateRequired(data.updatedAt),
        } as Documento;
    });
}

export async function getMyDocuments(userId: string, userEmail: string, hospitalId: string): Promise<Documento[]> {
  const docsRef = collection(db, "documents");

  const createdByQuery = query(
    docsRef,
    where("hospitalId", "==", hospitalId),
    where("createdByUid", "==", userId),
    where("isDeleted", "==", false)
  );

  const responsibleForQuery = query(
    docsRef,
    where("hospitalId", "==", hospitalId),
    where("responsableEmail", "==", userEmail),
    where("isDeleted", "==", false)
  );
  
  const [createdBySnapshot, responsibleForSnapshot] = await Promise.all([
      getDocs(createdByQuery),
      getDocs(responsibleForSnapshot)
  ]);

  const docsMap = new Map<string, Documento>();

  const processSnapshot = (snapshot: any) => {
    snapshot.docs.forEach((doc: any) => {
        if (!docsMap.has(doc.id)) {
            const data = doc.data();
            docsMap.set(doc.id, {
                id: doc.id,
                ...data,
                fechaDocumento: safeToDateRequired(data.fechaDocumento),
                fechaVigenciaDesde: safeToDate(data.fechaVigenciaDesde),
                fechaVigenciaHasta: safeToDate(data.fechaVigenciaHasta),
                createdAt: safeToDateRequired(data.createdAt),
                updatedAt: safeToDateRequired(data.updatedAt),
            } as Documento);
        }
    });
  }

  processSnapshot(createdBySnapshot);
  processSnapshot(responsibleForSnapshot);
  
  // Sort by most recently updated
  const sortedDocs = Array.from(docsMap.values()).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return sortedDocs;
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
    createdAt: safeToDateRequired(newUserData?.createdAt),
    updatedAt: safeToDateRequired(newUserData?.updatedAt),
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
          fechaDocumento: safeToDateRequired(data.fechaDocumento),
          fechaVigenciaDesde: safeToDate(data.fechaVigenciaDesde),
          fechaVigenciaHasta: safeToDate(data.fechaVigenciaHasta),
          createdAt: safeToDateRequired(data.createdAt),
          updatedAt: safeToDateRequired(data.updatedAt),
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

    const { ambitos: ambitosCatalog } = await getCatalogs(hospitalId);

    // Create a map of counts per ambitoId for efficient lookup
    const docsPerAmbitoId = docs.reduce((acc, doc) => {
        if (doc.ambitoId) {
            acc[doc.ambitoId] = (acc[doc.ambitoId] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    // Create the final array, sorted by the 'orden' property from the catalog
    const docsPorAmbito = [...ambitosCatalog]
        .sort((a, b) => a.orden - b.orden)
        .map(ambito => ({
            name: ambito.nombre,
            value: docsPerAmbitoId[ambito.id] || 0,
        }))
        .filter(ambito => ambito.value > 0); // Only include ámbitos that have documents

    return {
        totalDocs: allDocsSnap.size,
        vigentes: vigentesCount,
        proximosAVencer: proximosAVencerCount,
        docsPorAmbito: docsPorAmbito,
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
        createdAt: safeToDateRequired(data.createdAt),
        updatedAt: safeToDateRequired(data.updatedAt),
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
            createdAt: safeToDateRequired(data?.createdAt),
            updatedAt: safeToDateRequired(data?.updatedAt),
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
  const dataToUpdate: Record<string, any> = { updatedAt: serverTimestamp() };
  
  Object.keys(updates).forEach(key => {
    const value = updates[key as keyof typeof updates];
    if (value !== undefined) {
      dataToUpdate[key] = value;
    }
  });

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
      createdAt: safeToDateRequired(data?.createdAt),
      updatedAt: safeToDateRequired(data?.updatedAt),
    } as UserProfile;
}

export async function addDocument(docData: Omit<Documento, "id" | "createdAt" | "updatedAt">): Promise<Documento> {
  const collRef = collection(db, "documents");
  
  const dataToSave: { [key: string]: any } = {
    // Required fields
    titulo: docData.titulo,
    tipoDocumentoId: docData.tipoDocumentoId,
    version: docData.version,
    estadoDocId: docData.estadoDocId,
    ambitoId: docData.ambitoId,
    caracteristicaId: docData.caracteristicaId,
    elementoMedibleId: docData.elementoMedibleId,
    responsableNombre: docData.responsableNombre,
    responsableEmail: docData.responsableEmail,
    fechaDocumento: Timestamp.fromDate(docData.fechaDocumento),
    hospitalId: docData.hospitalId,
    fileName: docData.fileName,
    fileExt: docData.fileExt,
    fileSize: docData.fileSize,
    mimeType: docData.mimeType,
    storagePath: docData.storagePath,
    downloadUrl: docData.downloadUrl,
    createdByUid: docData.createdByUid,
    createdByEmail: docData.createdByEmail,
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),

    // Optional fields with safe defaults based on successful examples
    descripcion: docData.descripcion || "",
    linkedDocumentId: docData.linkedDocumentId || "",
    servicioIds: docData.servicioIds || [],
    tags: docData.tags || [],
    searchKeywords: docData.searchKeywords || [],
  };

  // Optional fields that should be ABSENT if not provided, or NULL if that's the valid state
  dataToSave.fechaVigenciaDesde = docData.fechaVigenciaDesde ? Timestamp.fromDate(docData.fechaVigenciaDesde) : null;
  dataToSave.fechaVigenciaHasta = docData.fechaVigenciaHasta ? Timestamp.fromDate(docData.fechaVigenciaHasta) : null;
  
  if (docData.checksum) {
    dataToSave.checksum = docData.checksum;
  }
  
  // Explicitly DO NOT add deletedAt or deletedByUid on creation, as they are absent in the successful examples.

  try {
    const docRef = await addDoc(collRef, dataToSave);
    const newDocSnap = await getDoc(docRef);
    const data = newDocSnap.data();
    return {
        id: newDocSnap.id,
        ...data,
        fechaDocumento: safeToDateRequired(data?.fechaDocumento),
        fechaVigenciaDesde: safeToDate(data?.fechaVigenciaDesde),
        fechaVigenciaHasta: safeToDate(data?.fechaVigenciaHasta),
        createdAt: safeToDateRequired(data?.createdAt),
        updatedAt: safeToDateRequired(data?.updatedAt),
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
              createdAt: safeToDateRequired(data.createdAt),
              updatedAt: safeToDateRequired(data.updatedAt),
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
  
  const dataToUpdate: Record<string, any> = { updatedAt: serverTimestamp() };

  // Explicitly handle each possible field from the update object
  if (updates.titulo !== undefined) dataToUpdate.titulo = updates.titulo;
  if (updates.descripcion !== undefined) dataToUpdate.descripcion = updates.descripcion || "";
  if (updates.tipoDocumentoId !== undefined) dataToUpdate.tipoDocumentoId = updates.tipoDocumentoId;
  if (updates.version !== undefined) dataToUpdate.version = updates.version;
  if (updates.estadoDocId !== undefined) dataToUpdate.estadoDocId = updates.estadoDocId;
  if (updates.ambitoId !== undefined) dataToUpdate.ambitoId = updates.ambitoId;
  if (updates.caracteristicaId !== undefined) dataToUpdate.caracteristicaId = updates.caracteristicaId;
  if (updates.elementoMedibleId !== undefined) dataToUpdate.elementoMedibleId = updates.elementoMedibleId;
  if (updates.servicioIds !== undefined) dataToUpdate.servicioIds = updates.servicioIds || [];
  if (updates.responsableNombre !== undefined) dataToUpdate.responsableNombre = updates.responsableNombre;
  if (updates.responsableEmail !== undefined) dataToUpdate.responsableEmail = updates.responsableEmail;
  if (updates.fechaDocumento) dataToUpdate.fechaDocumento = Timestamp.fromDate(updates.fechaDocumento);
  dataToUpdate.fechaVigenciaDesde = updates.fechaVigenciaDesde ? Timestamp.fromDate(updates.fechaVigenciaDesde) : null;
  dataToUpdate.fechaVigenciaHasta = updates.fechaVigenciaHasta ? Timestamp.fromDate(updates.fechaVigenciaHasta) : null;
  if (updates.tags !== undefined) dataToUpdate.tags = updates.tags || [];
  if (updates.searchKeywords !== undefined) dataToUpdate.searchKeywords = updates.searchKeywords || [];
  if (updates.linkedDocumentId !== undefined) dataToUpdate.linkedDocumentId = updates.linkedDocumentId || "";
  
  if (updates.isDeleted === true) {
    dataToUpdate.isDeleted = true;
    dataToUpdate.deletedAt = serverTimestamp();
    if (updates.deletedByUid !== undefined) dataToUpdate.deletedByUid = updates.deletedByUid;
  } else if (updates.isDeleted === false) {
    dataToUpdate.isDeleted = false;
    dataToUpdate.deletedAt = null;
    dataToUpdate.deletedByUid = null;
  }
  
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

export async function createNewVersionAndUpdateDocument(
  originalDoc: Documento,
  newData: Documento,
  userId: string
): Promise<void> {
  const versionRef = doc(collection(db, "document_versions"));
  const parentDocRef = doc(db, "documents", originalDoc.id);

  const batch = writeBatch(db);

  const versionData: Record<string, any> = {
    // referencia
    docId: originalDoc.id,
    hospitalId: originalDoc.hospitalId,

    // versión archivada
    version: originalDoc.version,
    estadoDocId: "est-hist",

    // archivo histórico
    storagePath: originalDoc.storagePath,
    downloadUrl: originalDoc.downloadUrl,
    fileSize: originalDoc.fileSize,
    fileName: originalDoc.fileName,
    fileExt: originalDoc.fileExt,
    mimeType: originalDoc.mimeType || "",

    // auditoría
    createdByUid: originalDoc.createdByUid || userId,
    createdByEmail: originalDoc.createdByEmail || "",
    archivedByUid: userId,

    // fotografía completa del documento
    titulo: originalDoc.titulo || "",
    descripcion: originalDoc.descripcion || "",
    tipoDocumentoId: originalDoc.tipoDocumentoId || "",
    ambitoId: originalDoc.ambitoId || "",
    caracteristicaId: originalDoc.caracteristicaId || "",
    elementoMedibleId: originalDoc.elementoMedibleId || "",
    servicioIds: originalDoc.servicioIds || [],
    responsableNombre: originalDoc.responsableNombre || "",
    responsableEmail: originalDoc.responsableEmail || "",
    fechaDocumento: originalDoc.fechaDocumento ? Timestamp.fromDate(originalDoc.fechaDocumento) : null,
    fechaVigenciaDesde: originalDoc.fechaVigenciaDesde ? Timestamp.fromDate(originalDoc.fechaVigenciaDesde) : null,
    fechaVigenciaHasta: originalDoc.fechaVigenciaHasta ? Timestamp.fromDate(originalDoc.fechaVigenciaHasta) : null,
    checksum: originalDoc.checksum || "",
    tags: originalDoc.tags || [],
    linkedDocumentId: originalDoc.linkedDocumentId || "",
    searchKeywords: originalDoc.searchKeywords || [],

    // timestamps
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const parentUpdateData: Record<string, any> = {
    titulo: newData.titulo,
    descripcion: newData.descripcion || "",
    tipoDocumentoId: newData.tipoDocumentoId,
    version: newData.version,
    estadoDocId: newData.estadoDocId,
    ambitoId: newData.ambitoId,
    caracteristicaId: newData.caracteristicaId,
    elementoMedibleId: newData.elementoMedibleId,
    servicioIds: newData.servicioIds || [],
    responsableNombre: newData.responsableNombre,
    responsableEmail: newData.responsableEmail,
    fechaDocumento: Timestamp.fromDate(newData.fechaDocumento),
    fechaVigenciaDesde: newData.fechaVigenciaDesde ? Timestamp.fromDate(newData.fechaVigenciaDesde) : null,
    fechaVigenciaHasta: newData.fechaVigenciaHasta ? Timestamp.fromDate(newData.fechaVigenciaHasta) : null,
    fileName: newData.fileName,
    fileExt: newData.fileExt,
    fileSize: newData.fileSize,
    mimeType: newData.mimeType,
    storagePath: newData.storagePath,
    downloadUrl: newData.downloadUrl,
    tags: newData.tags || [],
    linkedDocumentId: newData.linkedDocumentId || "",
    searchKeywords: newData.searchKeywords || [],
    updatedAt: serverTimestamp(),
  };

  batch.set(versionRef, versionData);
  batch.update(parentDocRef, parentUpdateData);

  try {
    await batch.commit();
  } catch (error) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: parentDocRef.path,
          operation: 'write',
          requestResourceData: { version: versionData, update: parentUpdateData },
        })
      );
      throw error;
  }
}

export async function getDocumentVersions(docId: string): Promise<DocumentVersion[]> {
    const versionsRef = collection(db, "document_versions");
    const q = query(
        versionsRef,
        where("docId", "==", docId),
        orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        const fallbackDate = new Date(0); 
        return {
            id: doc.id,
            ...data,
            createdAt: safeToDateRequired(data.createdAt, fallbackDate),
            updatedAt: safeToDateRequired(data.updatedAt, fallbackDate),
            fechaDocumento: safeToDateRequired(data.fechaDocumento, fallbackDate),
            fechaVigenciaDesde: safeToDate(data.fechaVigenciaDesde),
            fechaVigenciaHasta: safeToDate(data.fechaVigenciaHasta),
        } as DocumentVersion;
    });
}

export async function getDocumentVersionById(versionId: string): Promise<DocumentVersion | null> {
    const docRef = doc(db, "document_versions", versionId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            fechaDocumento: safeToDateRequired(data.fechaDocumento),
            fechaVigenciaDesde: safeToDate(data.fechaVigenciaDesde),
            fechaVigenciaHasta: safeToDate(data.fechaVigenciaHasta),
            createdAt: safeToDateRequired(data.createdAt),
            updatedAt: safeToDateRequired(data.updatedAt),
        } as DocumentVersion;
    }
    return null;
}

export async function addLibraryDocument(docData: Omit<LibraryDocument, "id" | "createdAt" | "updatedAt">): Promise<LibraryDocument> {
  const collRef = collection(db, "library_documents");
  
  const dataToSave = {
    ...docData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(collRef, dataToSave);
    const newDocSnap = await getDoc(docRef);
    const data = newDocSnap.data();
    return {
        id: newDocSnap.id,
        ...data,
        createdAt: safeToDateRequired(data?.createdAt),
        updatedAt: safeToDateRequired(data?.updatedAt),
    } as LibraryDocument;
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
