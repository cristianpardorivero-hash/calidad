'use client';

import { DocumentForm } from "@/components/documents/document-form";
import { getCatalogs, getDocuments } from "@/lib/data";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useMemo } from "react";
import type { Catalogs, Documento } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function NuevoDocumentoPage() {
  const { user } = useAuth();
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [documents, setDocuments] = useState<Documento[] | null>(null);
  const [loading, setLoading] = useState(true);
  const hospitalId = user?.hospitalId;
  const userRole = user?.role;
  const servicioIds = user?.servicioIds;
  const servicioIdsDependency = useMemo(() => servicioIds?.join(',') ?? '', [servicioIds]);

  useEffect(() => {
    if (hospitalId) {
      setLoading(true);
      Promise.all([
        getCatalogs(hospitalId),
        getDocuments(hospitalId, userRole, servicioIds)
      ]).then(([catalogsData, documentsData]) => {
          setCatalogs(catalogsData);
          setDocuments(documentsData);
          setLoading(false);
        })
        .catch(error => {
          console.error("Failed to fetch data", error);
          setLoading(false);
        });
    }
  }, [hospitalId, userRole, servicioIdsDependency]);

  const pageHeader = (
    <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Subir Nuevo Documento</h1>
        <p className="text-muted-foreground">
          Sigue los pasos para agregar un nuevo documento al sistema de forma fácil e intuitiva.
        </p>
    </div>
  );

  if (loading || !catalogs || !documents) {
    return (
        <div className="container mx-auto max-w-3xl">
            {pageHeader}
            <div className="space-y-8">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl">
      {pageHeader}
      <DocumentForm catalogs={catalogs} documents={documents} />
    </div>
  );
}
