export type UserRole = "admin" | "editor" | "lector";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  hospitalId: string;
  servicioIds?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
  deletedAt?: Date;
  allowedPages?: string[];
}

export interface Hospital {
  id: string;
  nombre: string;
  codigo?: string;
  servicioSalud?: string;
  createdAt: Date;
  updatedAt: Date;
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
  codigo: string;
  nombre:string;
  umbralCumplimiento?: string;
  orden: number;
}

export interface ElementoMedible {
  id: string;
  caracteristicaId: string;
  codigo: string;
  nombre: string;
  servicioIds?: string[];
  orden: number;
}

export interface TipoDocumento {
  id: string;
  nombre: string;
  orden: number;
}

export interface Servicio {
  id: string;
  nombre: string;
}

export interface EstadoAcreditacionDoc {
  id: string;
  nombre: string;
  orden: number;
}

export interface Catalogs {
  ambitos: Ambito[];
  caracteristicas: Caracteristica[];
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
  elementoMedibleId: string;
  // Contexto institucional
  servicioIds?: string[];
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
  // Etiquetas y Vinculación
  tags?: string[];
  linkedDocumentId?: string;
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

export interface DocumentVersion {
  id: string;
  docId: string;
  hospitalId: string;
  version: string;
  storagePath: string;
  downloadUrl: string;
  fileSize: number;
  fileName: string;
  fileExt: 'pdf' | 'docx' | 'xlsx';
  estadoDocId: string;
  createdAt: Date;
  createdByUid: string;
  createdByEmail: string;
  
  // Denormalized fields for display consistency
  titulo: string;
  descripcion?: string;
  tipoDocumentoId: string;
  ambitoId: string;
  caracteristicaId: string;
  elementoMedibleId: string;
  servicioIds?: string[];
  responsableNombre: string;
  responsableEmail: string;
  fechaDocumento: Date;
  fechaVigenciaDesde?: Date;
  fechaVigenciaHasta?: Date;
  mimeType: string;
  checksum?: string;
  tags?: string[];
  linkedDocumentId?: string;
  searchKeywords: string[];
  updatedAt: Date;
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
  timestamp: Date;
  details: Record<string, any> | string[];
}

    