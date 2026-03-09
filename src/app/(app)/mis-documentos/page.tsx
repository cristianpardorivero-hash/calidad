'use client';

import { MyDocumentCard } from "@/components/documents/my-document-card";
import { getCatalogs } from "@/lib/data";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DocumentsFilters } from "@/components/documents/documents-filters";
import { useEffect, useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/use-user";
import type { Catalogs, Documento } from "@/lib/types";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/client";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function MisDocumentosPage() {
  const { user } = useUser();
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("todos");
  const searchParams = useSearchParams();

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

      getCatalogs(hospitalId).then(setCatalogs);

    } else if (!user) {
        setLoading(false);
    }

    return () => unsubscribe();
  }, [hospitalId, userRole, servicioIdsDependency]);
  
  const canManage = user?.role === 'admin' || user?.role === 'editor';

  const filteredDocuments = useMemo(() => {
    const queryParam = searchParams.get("query");
    const ambitoId = searchParams.get("ambitoId");
    const caracteristicaId = searchParams.get("caracteristicaId");
    const elementoMedibleId = searchParams.get("elementoMedibleId");
    const tipoDocumentoId = searchParams.get("tipoDocumentoId");
    const estadoDocId = searchParams.get("estadoDocId");
    const servicioId = searchParams.get("servicioId");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    return documents.filter((doc) => {
      const from = fromParam ? new Date(fromParam) : null;
      const to = toParam ? new Date(toParam) : null;

      if (queryParam) {
        const lowerQuery = queryParam.toLowerCase();
        if (!doc.searchKeywords?.some(keyword => keyword.toLowerCase().includes(lowerQuery))) {
            return false;
        }
      }

      if (ambitoId && doc.ambitoId !== ambitoId) return false;
      if (caracteristicaId && doc.caracteristicaId !== caracteristicaId) return false;
      if (elementoMedibleId && doc.elementoMedibleId !== elementoMedibleId) return false;
      if (tipoDocumentoId && doc.tipoDocumentoId !== tipoDocumentoId) return false;
      if (estadoDocId && doc.estadoDocId !== estadoDocId) return false;
      if (servicioId && (!doc.servicioIds || !doc.servicioIds.includes(servicioId))) return false;

      if (from && doc.fechaDocumento < from) return false;
      if (to && doc.fechaDocumento > to) return false;

      return true;
    });
  }, [documents, searchParams]);

  const sortedTiposDocumento = useMemo(() => {
    if (!catalogs) return [];
    return [...catalogs.tiposDocumento].sort((a, b) => a.orden - b.orden);
  }, [catalogs]);

  const documentsForDisplay = useMemo(() => {
    if (selectedTab === 'todos') {
        if (!catalogs) return filteredDocuments;
        const sortedDocs = [...filteredDocuments].sort((a, b) => {
            const ambitoA_orden = catalogs.ambitos.find(ambito => ambito.id === a.ambitoId)?.orden ?? Infinity;
            const ambitoB_orden = catalogs.ambitos.find(ambito => ambito.id === b.ambitoId)?.orden ?? Infinity;
            if (ambitoA_orden !== ambitoB_orden) {
                return ambitoA_orden - ambitoB_orden;
            }

            const caracA_orden = catalogs.caracteristicas.find(c => c.id === a.caracteristicaId)?.orden ?? Infinity;
            const caracB_orden = catalogs.caracteristicas.find(c => c.id === b.caracteristicaId)?.orden ?? Infinity;
            if (caracA_orden !== caracB_orden) {
                return caracA_orden - caracB_orden;
            }

            const elemA_orden = catalogs.elementosMedibles.find(e => e.id === a.elementoMedibleId)?.orden ?? Infinity;
            const elemB_orden = catalogs.elementosMedibles.find(e => e.id === b.elementoMedibleId)?.orden ?? Infinity;
            if (elemA_orden !== elemB_orden) {
                return elemA_orden - elemB_orden;
            }

            const tipoA_orden = catalogs.tiposDocumento.find(t => t.id === a.tipoDocumentoId)?.orden ?? Infinity;
            const tipoB_orden = catalogs.tiposDocumento.find(t => t.id === b.tipoDocumentoId)?.orden ?? Infinity;
            if (tipoA_orden !== tipoB_orden) {
                return tipoA_orden - tipoB_orden;
            }
            
            return (b.fechaDocumento?.getTime() || 0) - (a.fechaDocumento?.getTime() || 0);
        });
        return sortedDocs;
    }
    return filteredDocuments.filter(doc => doc.tipoDocumentoId === selectedTab);
  }, [filteredDocuments, selectedTab, catalogs]);

  const pageHeader = (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Mis Documentos
        </h1>
        <p className="text-muted-foreground">
          Documentos disponibles para ti según tu rol y servicio asignado.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-80 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {pageHeader}
      <DocumentsFilters catalogs={catalogs} />
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          {sortedTiposDocumento.map((tipo) => (
            <TabsTrigger key={tipo.id} value={tipo.id}>
              {tipo.nombre}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {documentsForDisplay.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {documentsForDisplay.map(doc => (
                <MyDocumentCard key={doc.id} document={doc} catalogs={catalogs} />
            ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-muted/50 rounded-lg">
            <p className="text-lg font-semibold">No se encontraron documentos</p>
            <p className="text-muted-foreground mt-1">Prueba a cambiar los filtros o la pestaña seleccionada.</p>
        </div>
      )}
    </div>
  );
}
