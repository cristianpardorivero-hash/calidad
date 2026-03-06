'use client';

import { DocumentForm } from "@/components/documents/document-form";
import { getCatalogs, getDocuments, getDocumentById } from "@/lib/data";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import type { Catalogs, Documento } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "next/navigation";

export default function NuevaVersionDocumentoPage() {
  const { user } = useAuth();
  const params = useParams();
  const docId = params.docId as string;
  const hospitalId = user?.hospitalId;
  const userRole = user?.role;
  const servicioIds = user?.servicioIds;
  const servicioIdsDependency = servicioIds?.join(',') ?? '';

  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [documents, setDocuments] = useState<Documento[] | null>(null);
  const [documentToVersion, setDocumentToVersion] = useState<Documento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hospitalId && docId) {
      setLoading(true);
      Promise.all([
        getCatalogs(hospitalId),
        getDocuments(hospitalId, userRole, servicioIds),
        getDocumentById(docId)
      ]).then(([catalogsData, documentsData, docToVersionData]) => {
          if (!docToVersionData) {
            setError("Documento no encontrado.");
            setLoading(false);
            return;
          }
          setCatalogs(catalogsData);
          setDocuments(documentsData);
          setDocumentToVersion(docToVersionData);
          setLoading(false);
        })
        .catch(error => {
          console.error("Failed to fetch data for new version page", error);
          setError("Error al cargar los datos para la nueva versión.");
          setLoading(false);
        });
    }
  }, [hospitalId, userRole, servicioIdsDependency, docId]);

  const pageHeader = (
    <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Crear Nueva Versión</h1>
        <p className="text-muted-foreground">
          Sube un nuevo archivo para el documento <span className="font-semibold">{documentToVersion?.titulo}</span>. La versión se incrementará y los metadatos se pueden actualizar.
        </p>
    </div>
  );

  if (loading) {
    return (
        <div className="container mx-auto max-w-5xl">
            {pageHeader}
            <div className="space-y-8">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        </div>
    )
  }

  if (error) {
    return <div className="text-center text-destructive">{error}</div>;
  }

  if (!catalogs || !documents || !documentToVersion) {
    return <div className="text-center">No se pudieron cargar los datos del formulario.</div>
  }

  return (
    <div className="container mx-auto max-w-5xl">
      {pageHeader}
      <DocumentForm 
        catalogs={catalogs} 
        documents={documents} 
        document={documentToVersion} 
        isNewVersion={true} 
      />
    </div>
  );
}
