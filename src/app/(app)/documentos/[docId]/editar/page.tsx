'use client';

import { DocumentForm } from "@/components/documents/document-form";
import { getCatalogs, getDocuments, getDocumentById } from "@/lib/data";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import type { Catalogs, Documento } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "next/navigation";

export default function EditarDocumentoPage() {
  const { user } = useAuth();
  const params = useParams();
  const docId = params.docId as string;
  const hospitalId = user?.hospitalId;
  const userRole = user?.role;
  const servicioIds = user?.servicioIds;

  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [documents, setDocuments] = useState<Documento[] | null>(null);
  const [documentToEdit, setDocumentToEdit] = useState<Documento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hospitalId && docId) {
      setLoading(true);
      Promise.all([
        getCatalogs(hospitalId),
        getDocuments(hospitalId, userRole, servicioIds), // for linked documents dropdown
        getDocumentById(docId)
      ]).then(([catalogsData, documentsData, docToEditData]) => {
          if (!docToEditData) {
            setError("Documento no encontrado.");
            setLoading(false);
            return;
          }
          setCatalogs(catalogsData);
          setDocuments(documentsData);
          setDocumentToEdit(docToEditData);
          setLoading(false);
        })
        .catch(error => {
          console.error("Failed to fetch data for edit page", error);
          setError("Error al cargar los datos para editar.");
          setLoading(false);
        });
    }
  }, [hospitalId, userRole, servicioIds, docId]);

  const pageHeader = (
    <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Editar Documento</h1>
        <p className="text-muted-foreground">
          Modifique los detalles del documento y guarde los cambios.
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

  if (!catalogs || !documents || !documentToEdit) {
    return <div className="text-center">No se pudieron cargar los datos del formulario.</div>
  }

  return (
    <div className="container mx-auto max-w-5xl">
      {pageHeader}
      <DocumentForm catalogs={catalogs} documents={documents} document={documentToEdit} />
    </div>
  );
}
