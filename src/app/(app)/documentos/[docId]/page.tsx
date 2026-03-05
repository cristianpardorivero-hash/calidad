'use client';

import { getCatalogs, getDocumentById, getLinkedDocuments } from "@/lib/data";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  Edit,
  Trash2,
  FileText,
  Calendar,
  User,
  Tags,
  ShieldCheck,
  Building,
  ClipboardList,
  Binary,
  GitBranch,
  Info,
  Link as LinkIcon,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { Catalogs, Documento } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { storage } from "@/lib/firebase";
import { ref, getBlob } from "firebase/storage";

export default function DocumentoDetailPage() {
  const params = useParams();
  const docId = params.docId as string;
  const { user, firebaseUser } = useAuth();

  const [document, setDocument] = useState<Documento | null>(null);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [linkedDocuments, setLinkedDocuments] = useState<Documento[]>([]);
  const [mainDocument, setMainDocument] = useState<Documento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);


  useEffect(() => {
    let objectUrl: string | null = null;
    
    if (user && docId && firebaseUser) {
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        setLinkedDocuments([]);
        setMainDocument(null);
        setPreviewUrl(null);
        try {
          const [docData, catalogsData] = await Promise.all([
            getDocumentById(docId),
            getCatalogs(user.hospitalId),
          ]);
          
          if (!docData) {
            setError("Documento no encontrado.");
            setLoading(false);
            return;
          }

          setDocument(docData);
          setCatalogs(catalogsData);

          // Create a secure, local URL for the PDF preview
          if (docData.fileExt === 'pdf' && docData.storagePath) {
            try {
              const storageRef = ref(storage, docData.storagePath);
              const blob = await getBlob(storageRef);
              objectUrl = URL.createObjectURL(blob);
              setPreviewUrl(objectUrl);
            } catch (e: any) {
              console.error("Error creating PDF preview:", e);
              if (e.code === 'storage/unauthorized') {
                setError("No tienes permiso para ver este archivo. Contacta al administrador.");
              }
            }
          }

          // Now fetch linked documents based on the docData
          const [linkedDocumentsData, mainDocData] = await Promise.all([
            getLinkedDocuments(docId, user.hospitalId),
            docData.linkedDocumentId ? getDocumentById(docData.linkedDocumentId) : Promise.resolve(null)
          ]);
          
          setLinkedDocuments(linkedDocumentsData);
          setMainDocument(mainDocData || null);

        } catch (err) {
          console.error(err);
          setError("Error al cargar el documento.");
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else if (!user && !firebaseUser) {
      setLoading(true);
    }

    return () => {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
    }
  }, [user, docId, firebaseUser]);

  if (loading) {
    return (
        <div className="mx-auto max-w-7xl space-y-8">
            {/* Header Skeleton */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-9 w-80" />
                    <Skeleton className="h-5 w-96" />
                </div>
                <div className="flex flex-shrink-0 gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-28" />
                </div>
            </div>
            {/* Main Content Skeleton */}
            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Card className="h-full min-h-[600px]"><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent className="p-6"><Skeleton className="h-[500px] w-full" /></CardContent></Card>
                </div>
                <div className="space-y-8">
                    <Card><CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader><CardContent className="space-y-4">{Array.from({length: 4}).map((_,i) => <Skeleton key={i} className="h-8 w-full" />)}</CardContent></Card>
                    <Card><CardHeader><Skeleton className="h-6 w-2/4" /></CardHeader><CardContent className="space-y-2">{Array.from({length: 3}).map((_,i) => <Skeleton key={i} className="h-5 w-full" />)}</CardContent></Card>
                </div>
            </div>
        </div>
    );
  }

  if (error && !document) { // only show full page error if doc fails to load
    return <div className="text-center text-destructive">{error}</div>;
  }
  
  if (!document || !catalogs) {
      return <div className="text-center">Documento no encontrado.</div>;
  }

  const getCatalogName = (catalog: any, id: any) =>
    catalogs[catalog as keyof typeof catalogs]
      // @ts-ignore
      .find((item: any) => item.id === id)?.nombre || "N/A";
  
  const getServicioNames = (servicioIds: string[] | undefined) => {
    if (!servicioIds || servicioIds.length === 0) return "No especificado";
    return servicioIds.map(id => getCatalogName("servicios", id)).join(", ");
  };

  const renderPDF = (url: string | null) => {
    if (!url || error) { // Also check for general error
      return (
        <div className="flex h-full min-h-[600px] w-full flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 p-4">
          <FileText className="h-16 w-16 text-muted-foreground" />
          <p className="mt-4 text-center font-semibold text-muted-foreground">
            No se pudo cargar la previsualización del PDF.
          </p>
          {error && <p className="mt-2 text-center text-sm text-destructive">{error}</p>}
          <Button asChild className="mt-4" disabled={!document.downloadUrl}>
            <a href={document.downloadUrl}>
              <Download className="mr-2 h-4 w-4" /> Descargar PDF
            </a>
          </Button>
        </div>
      );
    }

    return (
      <iframe
        src={url}
        className="h-[800px] w-full rounded-lg border"
        title={document.titulo}
      />
    );
  };
  
  const renderOther = (url: string) => (
    <div className="flex h-full min-h-[600px] w-full flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <p className="mt-4 text-center text-muted-foreground">
            No hay previsualización disponible para archivos <strong>.{document.fileExt}</strong>.
        </p>
        <Button asChild className="mt-4">
          <a href={url} download={document.fileName}>
            <Download className="mr-2 h-4 w-4" /> Descargar Archivo
          </a>
        </Button>
      </div>
  )

  const detailItems = [
    { icon: GitBranch, label: "Versión", value: document.version },
    { icon: ShieldCheck, label: "Estado", value: getCatalogName("estadosAcreditacionDoc", document.estadoDocId) },
    { icon: ClipboardList, label: "Tipo", value: getCatalogName("tiposDocumento", document.tipoDocumentoId) },
    { icon: User, label: "Responsable", value: `${document.responsableNombre} (${document.responsableEmail})` },
    { icon: Building, label: "Servicios", value: getServicioNames(document.servicioIds) },
    { icon: Calendar, label: "Fecha Documento", value: format(document.fechaDocumento, "d 'de' MMMM, yyyy", { locale: es }) },
    { icon: Calendar, label: "Vigencia", value: document.fechaVigenciaDesde ? `${format(document.fechaVigenciaDesde, "dd/MM/yy")} - ${document.fechaVigenciaHasta ? format(document.fechaVigenciaHasta, "dd/MM/yy") : 'Indefinida'}` : 'No aplica' },
    { icon: Binary, label: "Tamaño", value: `${(document.fileSize / 1024).toFixed(2)} KB` },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{document.titulo}</h1>
          <p className="max-w-prose text-muted-foreground">{document.descripcion}</p>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <Button variant="outline" asChild><Link href={`/documentos/${document.id}/editar`}><Edit className="mr-2 h-4 w-4" /> Editar</Link></Button>
          <Button asChild><a href={document.downloadUrl} download={document.fileName}><Download className="mr-2 h-4 w-4" /> Descargar</a></Button>
          <Button variant="destructive" className="hidden sm:inline-flex"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Preview */}
        <div className="lg:col-span-2">
            <Card className="h-full">
                <CardHeader><CardTitle>Previsualización del Documento</CardTitle></CardHeader>
                <CardContent>
                    {document.fileExt === "pdf" ? renderPDF(previewUrl) : renderOther(document.downloadUrl)}
                </CardContent>
            </Card>
        </div>

        {/* Right Column: Details */}
        <div className="space-y-8">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Info className="h-5 w-5"/> Detalles</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {detailItems.map(item => (
                <div key={item.label} className="flex items-start">
                    <item.icon className="mr-3 h-4 w-4 flex-shrink-0 text-muted-foreground mt-1" />
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-semibold">{item.value}</p>
                    </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Clasificación de Acreditación</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
                <p><strong>Ámbito:</strong> {getCatalogName("ambitos", document.ambitoId)}</p>
                <p><strong>Característica:</strong> {getCatalogName("caracteristicas", document.caracteristicaId)}</p>
                <p><strong>Elem. Medible:</strong> {getCatalogName("elementosMedibles", document.elementoMedibleId)}</p>
            </CardContent>
          </Card>

          {linkedDocuments.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><LinkIcon className="h-5 w-5"/> Documentos Vinculados</CardTitle></CardHeader>
              <CardContent className="space-y-2">
              {linkedDocuments.map(linkedDoc => (
                  <div key={linkedDoc.id} className="flex items-center justify-between rounded-md border bg-muted/20 p-3">
                      <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground"/>
                          <div className="flex flex-col">
                              <Link href={`/documentos/${linkedDoc.id}`} className="font-medium hover:underline text-sm">
                                  {linkedDoc.titulo}
                              </Link>
                              <span className="text-xs text-muted-foreground">v{linkedDoc.version}</span>
                          </div>
                      </div>
                      <div className="flex items-center">
                          <Button variant="ghost" size="icon" asChild>
                              <Link href={`/documentos/${linkedDoc.id}`} title="Ver documento">
                                  <Eye className="h-4 w-4" />
                              </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                              <a href={linkedDoc.downloadUrl} download={linkedDoc.fileName} title="Descargar archivo">
                                  <Download className="h-4 w-4" />
                              </a>
                          </Button>
                      </div>
                  </div>
              ))}
              </CardContent>
          </Card>
          )}

          {mainDocument && (
              <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><LinkIcon className="h-5 w-5"/> Vinculado al Documento</CardTitle></CardHeader>
                  <CardContent>
                  <div className="flex items-center justify-between rounded-md border bg-muted/20 p-3">
                      <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground"/>
                          <div className="flex flex-col">
                              <Link href={`/documentos/${mainDocument.id}`} className="font-medium hover:underline text-sm">
                                  {mainDocument.titulo}
                              </Link>
                              <span className="text-xs text-muted-foreground">v{mainDocument.version}</span>
                          </div>
                      </div>
                      <div className="flex items-center">
                          <Button variant="ghost" size="icon" asChild>
                              <Link href={`/documentos/${mainDocument.id}`} title="Ver documento">
                                  <Eye className="h-4 w-4" />
                              </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                              <a href={mainDocument.downloadUrl} download={mainDocument.fileName} title="Descargar archivo">
                                  <Download className="h-4 w-4" />
                              </a>
                          </Button>
                      </div>
                  </div>
                  </CardContent>
              </Card>
          )}
          
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Tags className="h-5 w-5"/> Etiquetas</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {document.tags && document.tags.length > 0 ? (
                document.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary">{tag}</Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sin etiquetas.</p>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
