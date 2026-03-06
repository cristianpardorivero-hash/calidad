'use client';

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getMyDocuments } from "@/lib/data";
import type { Documento } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { MyDocumentCard } from "@/components/documents/my-document-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FilePlus } from "lucide-react";

export default function MisDocumentosPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid && user?.email && user?.hospitalId) {
      setLoading(true);
      getMyDocuments(user.uid, user.email, user.hospitalId)
        .then(data => {
          setDocuments(data);
          setLoading(false);
        })
        .catch(error => {
          console.error("Failed to fetch my documents", error);
          setLoading(false);
        });
    } else if (!user) {
        // If user is not logged in, stop loading.
        setLoading(false);
    }
  }, [user]);

  const pageHeader = (
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight">Mis Documentos</h1>
      <p className="text-muted-foreground">
        Documentos que has creado o de los que eres responsable.
      </p>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-8">
        {pageHeader}
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
      {documents.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {documents.map(doc => (
            <MyDocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center mt-16">
            <h3 className="text-xl font-semibold">No se encontraron documentos</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
                No has creado ningún documento ni has sido asignado como responsable de uno.
            </p>
            <Button asChild className="mt-4">
                <Link href="/documentos/nuevo">
                    <FilePlus className="mr-2 h-4 w-4" />
                    Subir mi primer documento
                </Link>
            </Button>
        </div>
      )}
    </div>
  );
}
