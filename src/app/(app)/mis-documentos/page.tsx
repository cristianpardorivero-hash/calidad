'use client';

import { MyDocumentCard } from "@/components/documents/my-document-card";
import { getCatalogs } from "@/lib/data";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DocumentsFilters } from "@/components/documents/documents-filters";
import { useEffect, useState, useMemo, Fragment } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/use-user";
import type { Catalogs, Documento, TipoDocumento } from "@/lib/types";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/client";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


export default function MisDocumentosPage() {
  const { user } = useUser();
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("todos");
  const [caracteristicaFilters, setCaracteristicaFilters] = useState<Record<string, string>>({});
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
        if (!doc.searchKeywords?.some(keyword => keyword.includes(lowerQuery))) {
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

  const groupedDocuments = useMemo(() => {
    if (!catalogs) return [];

    const docsToProcess = selectedTab === 'todos'
        ? filteredDocuments
        : filteredDocuments.filter(doc => doc.tipoDocumentoId === selectedTab);
        
    if (docsToProcess.length === 0) return [];
    
    // Group documents by ambito and then by caracteristica
    const groupedByAmbito = docsToProcess.reduce((acc, doc) => {
        const ambito = catalogs.ambitos.find(a => a.id === doc.ambitoId) || { id: 'sin-ambito', nombre: 'Sin Ámbito', orden: Infinity };
        if (!acc[ambito.id]) {
            acc[ambito.id] = { ...ambito, caracteristicas: {}, docCount: 0 };
        }

        const caracteristica = catalogs.caracteristicas.find(c => c.id === doc.caracteristicaId) || { id: 'sin-caracteristica', nombre: 'Sin Característica', orden: Infinity, codigo: 'S/C' };
        if (!acc[ambito.id].caracteristicas[caracteristica.id]) {
            acc[ambito.id].caracteristicas[caracteristica.id] = { ...caracteristica, documentos: [] };
        }
        
        acc[ambito.id].caracteristicas[caracteristica.id].documentos.push(doc);
        acc[ambito.id].docCount++;
        return acc;
    }, {} as any);

    // Convert the grouped object into sorted arrays
    const result = Object.values(groupedByAmbito).map((ambito: any) => {
        const caracteristicasArray = Object.values(ambito.caracteristicas)
            .map((caracteristica: any) => {
                caracteristica.documentos.sort((a: Documento, b: Documento) => (b.fechaDocumento?.getTime() || 0) - (a.fechaDocumento?.getTime() || 0));
                return caracteristica;
            })
            .sort((a: any, b: any) => (a.orden || Infinity) - (b.orden || Infinity));
        
        return { ...ambito, caracteristicas: caracteristicasArray };
    }).sort((a: any, b: any) => (a.orden || Infinity) - (b.orden || Infinity));

    return result;
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

      {groupedDocuments && groupedDocuments.length > 0 ? (
        <Accordion
          type="multiple"
          collapsible
          className="w-full space-y-4"
        >
          {groupedDocuments.map((ambitoGroup) => (
            <AccordionItem value={ambitoGroup.id} key={ambitoGroup.id} className="border rounded-lg bg-card shadow-sm">
              <AccordionTrigger className="p-4 text-lg font-semibold hover:no-underline">
                <div className="flex items-center gap-4">
                  <span>{ambitoGroup.nombre}</span>
                  <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded-md">{ambitoGroup.docCount} documentos</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0">
                  <Accordion
                      type="multiple"
                      collapsible
                      className="w-full space-y-3"
                  >
                      {ambitoGroup.caracteristicas.map((caracteristicaGroup: any) => {
                          const tiposEnCaracteristica = [...new Set(caracteristicaGroup.documentos.map((d: Documento) => d.tipoDocumentoId))]
                            .map(id => catalogs.tiposDocumento.find(t => t.id === id))
                            .filter((t): t is TipoDocumento => !!t)
                            .sort((a,b) => a.orden - b.orden);

                          const selectedTipo = caracteristicaFilters[caracteristicaGroup.id] || 'todos';

                          const documentosFiltradosPorTipo = selectedTipo === 'todos'
                            ? caracteristicaGroup.documentos
                            : caracteristicaGroup.documentos.filter((doc: Documento) => doc.tipoDocumentoId === selectedTipo);

                          return (
                            <AccordionItem value={caracteristicaGroup.id} key={caracteristicaGroup.id} className="border rounded-md bg-background">
                                <AccordionTrigger className="px-4 py-3 text-md font-medium hover:no-underline">
                                    <div className="flex items-center gap-3 text-left">
                                        <span className="font-mono text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5">{caracteristicaGroup.codigo}</span>
                                        <span>{caracteristicaGroup.nombre}</span>
                                        <span className="text-sm font-normal text-muted-foreground">({caracteristicaGroup.documentos.length})</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4">
                                    {tiposEnCaracteristica.length > 1 && (
                                        <Tabs 
                                            value={selectedTipo} 
                                            onValueChange={(value) => setCaracteristicaFilters(prev => ({...prev, [caracteristicaGroup.id]: value}))} 
                                            className="mb-4"
                                        >
                                            <TabsList className="h-auto flex-wrap justify-start">
                                                <TabsTrigger value="todos">Todos</TabsTrigger>
                                                {tiposEnCaracteristica.map(tipo => (
                                                    <TabsTrigger key={tipo.id} value={tipo.id}>{tipo.nombre}</TabsTrigger>
                                                ))}
                                            </TabsList>
                                        </Tabs>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pt-4 border-t">
                                        {documentosFiltradosPorTipo.map((doc: Documento) => (
                                            <MyDocumentCard key={doc.id} document={doc} catalogs={catalogs} />
                                        ))}
                                    </div>
                                     {documentosFiltradosPorTipo.length === 0 && (
                                        <div className="text-center py-10 col-span-full border-t">
                                            <p className="text-sm text-muted-foreground">No hay documentos de este tipo.</p>
                                        </div>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                          );
                      })}
                  </Accordion>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="text-center py-24 bg-muted/50 rounded-lg">
            <p className="text-lg font-semibold">No se encontraron documentos</p>
            <p className="text-muted-foreground mt-1">Prueba a cambiar los filtros o la pestaña seleccionada.</p>
        </div>
      )}
    </div>
  );
}
