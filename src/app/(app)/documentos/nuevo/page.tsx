'use client';

import { DocumentForm } from "@/components/documents/document-form";
import { getCatalogs, getDocuments } from "@/lib/data";
import { useUser } from "@/hooks/use-user";
import { useEffect, useState, useMemo } from "react";
import type { Catalogs, Documento } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal } from "lucide-react";

export default function NuevoDocumentoPage() {
  const { user } = useUser();
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [documents, setDocuments] = useState<Documento[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>(['Consola de depuración lista.']);
  const hospitalId = user?.hospitalId;
  const userRole = user?.role;
  const servicioIds = user?.servicioIds;
  const servicioIdsDependency = useMemo(() => servicioIds?.join(',') ?? '', [servicioIds]);

  const addLog = (message: string) => {
    setLogs(prevLogs => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prevLogs]);
  };

  useEffect(() => {
    if (hospitalId) {
      setLoading(true);
      addLog("Cargando catálogos y documentos existentes...");
      Promise.all([
        getCatalogs(hospitalId),
        getDocuments(hospitalId, userRole, servicioIds)
      ]).then(([catalogsData, documentsData]) => {
          setCatalogs(catalogsData);
          setDocuments(documentsData);
          setLoading(false);
          addLog("Catálogos y documentos cargados exitosamente.");
        })
        .catch(error => {
          console.error("Failed to fetch data", error);
          setLoading(false);
          addLog(`Error al cargar datos iniciales: ${error.message}`);
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
  
  const DebugConsole = () => (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Terminal className="h-5 w-5" />
          Consola de Depuración de Subida
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48 w-full rounded-md border bg-muted/50 p-4">
          <pre className="text-xs">
            {logs.join('\n')}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
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
            <DebugConsole />
        </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl">
      {pageHeader}
      <DocumentForm catalogs={catalogs} documents={documents} addLog={addLog} />
      <DebugConsole />
    </div>
  );
}
