import type { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "editor" | "lector";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  hospitalId: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Hospital {
  id: string;
  nombre: string;
  codigo?: string;
  servicioSalud?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Catalog Item Types
export interface Ambito {
  id: string;
  nombre: string;
  orden: number;
}

export interface Caracteristica {
  id: string;
  ambitoId: string;
  nombre:string;
  orden: number;
}

export interface PuntoVerificacion {
  id: string;
  caracteristicaId: string;
  codigo: string;
  nombre: string;
  orden: number;
}

export interface ElementoMedible {
  id: string;
  puntoVerificacionId: string;
  codigo: string;
  nombre: string;
  orden: number;
}

export interface TipoDocumento {
  id: string;
  nombre: string;
}

export interface Servicio {
  id: string;
  nombre: string;
}

export interface EstadoAcreditacionDoc {
  id: string;
  nombre: string;
}

export interface Catalogs {
  ambitos: Ambito[];
  caracteristicas: Caracteristica[];
  puntosVerificacion: PuntoVerificacion[];
  elementosMedibles: ElementoMedible[];
  tiposDocumento: TipoDocumento[];
  servicios: Servicio[];
  estadosAcreditacionDoc: EstadoAcreditacionDoc[];
}

export interface Documento {
  id: string;
  // Identificación
  hospitalId: string;
  titulo: string;
  descripcion?: string;
  tipoDocumentoId: string;
  version: string;
  estadoDocId: string;
  // Clasificación Acreditación
  ambitoId: string;
  caracteristicaId: string;
  puntoVerificacionId: string;
  elementoMedibleId: string;
  // Contexto institucional
  servicioId?: string;
  responsableNombre: string;
  responsableEmail: string;
  // Fechas
  fechaDocumento: Date;
  fechaVigenciaDesde?: Date;
  fechaVigenciaHasta?: Date;
  // Archivo
  fileName: string;
  fileExt: "pdf" | "docx" | "xlsx";
  mimeType: string;
  fileSize: number;
  storagePath: string;
  downloadUrl: string;
  checksum?: string;
  // Etiquetas
  tags?: string[];
  // Control / trazabilidad
  createdByUid: string;
  createdByEmail: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedByUid?: string;
  // Búsqueda
  searchKeywords: string[];
}

export type AuditAction = 
  | "UPLOAD" 
  | "UPDATE_META" 
  | "DELETE" 
  | "RESTORE" 
  | "DOWNLOAD" 
  | "LOGIN" 
  | "CHANGE_ROLE";

export interface AuditLog {
  id: string;
  hospitalId: string;
  actorUid: string;
  actorEmail: string;
  action: AuditAction;
  docId?: string;
  timestamp: Timestamp;
  details: Record<string, any>;
}
