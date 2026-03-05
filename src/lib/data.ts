// This file mocks data fetching that would otherwise come from Firebase.
import { seedCatalogs } from "./seed-data";
import type { Catalogs, Documento, UserProfile } from "./types";
import { add, sub } from "date-fns";

let mockDocuments: Documento[] = Array.from({ length: 28 }, (_, i) => {
  const createdAt = sub(new Date(), { days: i * 5 });
  const docDate = sub(createdAt, { days: 2 });
  const ambito = seedCatalogs.ambitos[i % seedCatalogs.ambitos.length];
  const caracteristicas = seedCatalogs.caracteristicas.filter(c => c.ambitoId === ambito.id);
  const caracteristica = caracteristicas[i % caracteristicas.length];
  const puntos = seedCatalogs.puntosVerificacion.filter(p => p.caracteristicaId === caracteristica.id);
  const punto = puntos.length > 0 ? puntos[i % puntos.length] : seedCatalogs.puntosVerificacion[0];
  const elementos = seedCatalogs.elementosMedibles.filter(e => e.puntoVerificacionId === punto.id);
  const elemento = elementos.length > 0 ? elementos[i % elementos.length] : seedCatalogs.elementosMedibles[0];
  const tipo = seedCatalogs.tiposDocumento[i % seedCatalogs.tiposDocumento.length];
  const estado = seedCatalogs.estadosAcreditacionDoc[i % seedCatalogs.estadosAcreditacionDoc.length];
  const servicio = seedCatalogs.servicios[i % seedCatalogs.servicios.length];
  const hasVigencia = i % 3 !== 0;

  return {
    id: `doc_${i + 1}`,
    hospitalId: "hcurepto",
    titulo: `Documento de Prueba ${i + 1}: ${tipo.nombre} de ${ambito.nombre}`,
    descripcion: `Descripción detallada para el documento de prueba número ${i + 1}. Este documento es un ${tipo.nombre} y pertenece al ámbito de ${ambito.nombre}.`,
    tipoDocumentoId: tipo.id,
    version: `${Math.floor(i / 5) + 1}.0`,
    estadoDocId: estado.id,
    ambitoId: ambito.id,
    caracteristicaId: caracteristica.id,
    puntoVerificacionId: punto.id,
    elementoMedibleId: elemento.id,
    servicioId: servicio.id,
    responsableNombre: i % 2 === 0 ? "Dr. Juan Pérez" : "Enf. María González",
    responsableEmail: i % 2 === 0 ? "jperez@hospital.cl" : "mgonzalez@hospital.cl",
    fechaDocumento: docDate,
    fechaVigenciaDesde: hasVigencia ? docDate : undefined,
    fechaVigenciaHasta: hasVigencia ? add(docDate, { days: (i - 14) * 15 }) : undefined, // Some will be expired, some future
    fileName: `documento_${i + 1}.pdf`,
    fileExt: "pdf",
    mimeType: "application/pdf",
    fileSize: 1024 * (150 + i * 20),
    storagePath: `/documentos/hcurepto/${ambito.id}/${caracteristica.id}/${punto.id}/${elemento.id}/doc_${i + 1}/documento_${i + 1}.pdf`,
    downloadUrl: "#",
    tags: ["importante", tipo.nombre.toLowerCase()],
    createdByUid: i % 2 === 0 ? "1a2b3c" : "4d5e6f",
    createdByEmail: i % 2 === 0 ? "director@hospital.cl" : "editor@hospital.cl",
    createdAt: createdAt,
    updatedAt: add(createdAt, { hours: i }),
    isDeleted: false,
    searchKeywords: [`documento`, `prueba`, `${i + 1}`, tipo.nombre.toLowerCase(), ambito.nombre.toLowerCase()],
  };
});

let mockUsers: UserProfile[] = [
    { uid: '1a2b3c', displayName: 'Director HC', email: 'director@hospital.cl', role: 'admin', hospitalId: 'hcurepto', servicioId: 'srv-dir', isActive: true, createdAt: new Date() as any, updatedAt: new Date() as any },
    { uid: '4d5e6f', displayName: 'Editor Contenidos', email: 'editor@hospital.cl', role: 'editor', hospitalId: 'hcurepto', servicioId: 'srv-med', isActive: true, createdAt: new Date() as any, updatedAt: new Date() as any },
    { uid: '7g8h9i', displayName: 'Lector Calidad', email: 'lector@hospital.cl', role: 'lector', hospitalId: 'hcurepto', servicioId: 'srv-cal', isActive: true, createdAt: new Date() as any, updatedAt: new Date() as any },
    { uid: 'j1k2l3', displayName: 'Usuario Inactivo', email: 'inactivo@hospital.cl', role: 'lector', hospitalId: 'hcurepto', servicioId: 'srv-urg', isActive: false, createdAt: new Date() as any, updatedAt: new Date() as any },
];

export async function getCatalogs(hospitalId: string): Promise<Catalogs> {
  console.log(`Fetching catalogs for hospital: ${hospitalId}`);
  // In a real app, this would be a Firestore query
  return Promise.resolve(seedCatalogs);
}

export async function getDocuments(hospitalId: string, user: UserProfile): Promise<Documento[]> {
  console.log(`Fetching documents for hospital: ${hospitalId} for user ${user.email}`);
  // In a real app, this would be a Firestore query based on user role
  const allDocs = mockDocuments.filter(doc => !doc.isDeleted && doc.hospitalId === hospitalId);

  if (user.role === 'lector' && user.servicioId) {
    return Promise.resolve(allDocs.filter(doc => doc.servicioId === user.servicioId));
  }
  
  // Admins and Editors see all documents
  return Promise.resolve(allDocs);
}

export async function getDocumentById(docId: string): Promise<Documento | undefined> {
  console.log(`Fetching document by id: ${docId}`);
  return Promise.resolve(mockDocuments.find(doc => doc.id === docId));
}

export async function getDashboardKPIs(hospitalId: string) {
    const now = new Date();
    const docs = mockDocuments.filter(d => d.hospitalId === hospitalId && !d.isDeleted);
    const totalDocs = docs.length;
    const vigentes = docs.filter(d => d.estadoDocId === 'est-vig').length;
    
    const proximosAVencer = docs.filter(d => 
      d.fechaVigenciaHasta &&
      d.fechaVigenciaHasta > now &&
      d.fechaVigenciaHasta <= add(now, { days: 60 })
    ).length;

    const docsPorAmbito = docs.reduce((acc, doc) => {
        const ambito = seedCatalogs.ambitos.find(a => a.id === doc.ambitoId);
        if (ambito) {
            acc[ambito.nombre] = (acc[ambito.nombre] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    return Promise.resolve({
        totalDocs,
        vigentes,
        proximosAVencer,
        docsPorAmbito: Object.entries(docsPorAmbito).map(([name, value]) => ({ name, value }))
    });
}

export async function getUsers(hospitalId: string): Promise<UserProfile[]> {
    return Promise.resolve(mockUsers.filter(u => u.hospitalId === hospitalId));
}

export async function addDocument(doc: Omit<Documento, 'id' | 'createdAt' | 'updatedAt'>) {
    const newDoc: Documento = {
        ...doc,
        id: `doc_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    mockDocuments.unshift(newDoc);
    return Promise.resolve(newDoc);
}
