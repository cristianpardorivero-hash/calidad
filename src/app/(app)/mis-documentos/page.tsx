'use client';

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getMyDocuments, getCatalogs } from "@/lib/data";
import type { Documento, Catalogs } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { MyDocumentCard } from "@/components/documents/my-document-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FilePlus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function MisDocumentosPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const userId = user?.uid;
  const userEmail = user?.email;
  const hospitalId = user?.hospitalId;

  useEffect(() => {
    if (userId && userEmail && hospitalId) {
      setLoading(true);
      Promise.all([
        getMyDocuments(userId, userEmail, hospitalId),
        getCatalogs(hospitalId)
      ]).then(([docsData, catalogsData]) => {
          setDocuments(docsData);
          setCatalogs(catalogsData);
          setLoading(false);
        })
        .catch(error => {
          console.error("Failed to fetch my documents or catalogs", error);
          setLoading(false);
        });
    } else if (!user) {
        setLoading(false);
    }
  }, [userId, userEmail, hospitalId]);

  const filteredDocuments = useMemo(() => {
    if (!documents || !catalogs) return [];
    if (!searchQuery) return documents;
    
    const lowerCaseQuery = searchQuery.toLowerCase();

    return documents.filter(doc => {
      const ambitoName = catalogs.ambitos.find(a => a.id === doc.ambitoId)?.nombre || '';
      const caracteristicaName = catalogs.caracteristicas.find(c => c.id === doc.caracteristicaId)?.nombre || '';

      const titleMatch = doc.titulo.toLowerCase().includes(lowerCaseQuery);
      const responsableMatch = doc.responsableNombre.toLowerCase().includes(lowerCaseQuery);
      const tagMatch = doc.tags?.some(tag => tag.toLowerCase().includes(lowerCaseQuery));
      const ambitoMatch = ambitoName.toLowerCase().includes(lowerCaseQuery);
      const caracteristicaMatch = caracteristicaName.toLowerCase().includes(lowerCaseQuery);

      return titleMatch || responsableMatch || tagMatch || ambitoMatch || caracteristicaMatch;
    });
  }, [documents, searchQuery, catalogs]);

  const canManage = user?.role === 'admin' || user?.role === 'editor';

  const pageHeader = (
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight">Mis Documentos</h1>
      <p className="text-muted-foreground">
        Documentos que has creado o de los que eres responsable.
      </p>
    </div>
  );

  const searchBar = (
    <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
            placeholder="Buscar por título, tag, responsable, ámbito o característica..."
            className="h-11 pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
        />
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-8">
        {pageHeader}
        <Skeleton className="h-11 w-full" />
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Skeleton className="h-[280px] w-full" />
          <Skeleton className="h-[280px] w-full" />
          <Skeleton className="h-[280px] w-full" />
          <Skeleton className="h-[280px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {pageHeader}
      {searchBar}
      {filteredDocuments.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDocuments.map(doc => (
            <MyDocumentCard key={doc.id} document={doc} catalogs={catalogs!} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center mt-16">
            <h3 className="text-xl font-semibold">No se encontraron documentos</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
                {searchQuery 
                    ? "No hay documentos que coincidan con tu búsqueda."
                    : "No has creado ningún documento ni has sido asignado como responsable de uno."
                }
            </p>
            {!searchQuery && canManage && (
                <Button asChild className="mt-4">
                    <Link href="/documentos/nuevo">
                        <FilePlus className="mr-2 h-4 w-4" />
                        Subir mi primer documento
                    </Link>
                </Button>
            )}
        </div>
      )}
    </div>
  );
}
