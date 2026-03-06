
"use client";

import { DocumentsTable } from "@/components/documents/documents-table";
import { getCatalogs } from "@/lib/data";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DocumentsFilters } from "@/components/documents/documents-filters";
import { useEffect, useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import type { Catalogs, Documento } from "@/lib/types";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DocumentosPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [loading, setLoading] = useState(true);

  const hospitalId = user?.hospitalId;
  const userRole = user?.role;
  const servicioIds = user?.servicioIds;
  const servicioIdsDependency = useMemo(() => servicioIds?.join(',') ?? '', [servicioIds]);

  useEffect(() => {
    let unsubscribe = () => {};
    if (hospitalId && userRole) {
      setLoading(true);

      const docsRef = collection(db, "documents");
      let q;
      if (userRole === "lector" && servicioIds && servicioIds.length > 0) {
        q = query(
          docsRef,
          where("hospitalId", "==", hospitalId),
          where("isDeleted", "==", false),
          where("servicioIds", "array-contains-any", servicioIds)
        );
      } else {
        q = query(
          docsRef,
          where("hospitalId", "==", hospitalId),
          where("isDeleted", "==", false)
        );
      }

      unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedDocs = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            fechaDocumento: (data.fechaDocumento as Timestamp)?.toDate(),
            fechaVigenciaDesde: (data.fechaVigenciaDesde as Timestamp)?.toDate(),
            fechaVigenciaHasta: (data.fechaVigenciaHasta as Timestamp)?.toDate(),
            createdAt: (data.createdAt as Timestamp)?.toDate(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate(),
          } as Documento;
        });
        setDocuments(fetchedDocs);
        setLoading(false);
      }, (error) => {
        console.error("Error listening to documents:", error);
        setLoading(false);
      });

      // Catalogs can be fetched once as they don't change as often
      getCatalogs(hospitalId).then(setCatalogs);

    } else if (!user) {
        setLoading(false);
    }

    return () => unsubscribe();
  }, [hospitalId, userRole, servicioIdsDependency]);
  
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
      />
    </div>
  );
}
