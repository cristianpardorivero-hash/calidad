
"use client";

import { DocumentsTable } from "@/components/documents/documents-table";
import { getCatalogs, getDocuments } from "@/lib/data";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DocumentsFilters } from "@/components/documents/documents-filters";
import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import type { Catalogs, Documento, UserProfile } from "@/lib/types";

export default function DocumentosPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDocumentsChange = useCallback(() => {
    setRefreshTrigger(t => t + 1);
  }, []);

  const hospitalId = user?.hospitalId;
  const userRole = user?.role;
  // Stringify to create a stable dependency for the useEffect hook
  const servicioIdsStr = JSON.stringify(user?.servicioIds); 

  useEffect(() => {
    const fetchData = async () => {
      if (hospitalId && userRole) {
        setLoading(true);
        const servicioIds = user?.servicioIds;
        const [fetchedDocs, fetchedCatalogs] = await Promise.all([
          getDocuments(hospitalId, userRole, servicioIds),
          getCatalogs(hospitalId),
        ]);
        setDocuments(fetchedDocs);
        setCatalogs(fetchedCatalogs);
        setLoading(false);
      }
    };
    fetchData();
  }, [hospitalId, userRole, servicioIdsStr, refreshTrigger]);
  
  const canManage = user?.role === 'admin' || user?.role === 'editor';

  const pageHeader = (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Explorador de Documentos
        </h1>
        <p className="text-muted-foreground">
          Busca, filtra y gestiona todos los documentos de acreditación.
        </p>
      </div>
      {canManage && (
        <Button asChild>
          <Link href="/documentos/nuevo">
            <PlusCircle className="mr-2 h-4 w-4" /> Subir Documento
          </Link>
        </Button>
      )}
    </div>
  );

  if (loading || !catalogs || !user) {
    return (
      <div className="space-y-8">
        {pageHeader}
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {pageHeader}
      <DocumentsFilters catalogs={catalogs} />
      <DocumentsTable
        documents={documents}
        catalogs={catalogs}
        user={user}
        onDocumentsChange={handleDocumentsChange}
      />
    </div>
  );
}
