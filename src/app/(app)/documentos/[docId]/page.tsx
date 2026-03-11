'use client';

import { getCatalogs, getDocumentById, getLinkedDocuments, getDocumentVersions } from "@/lib/data";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Download,
  Edit,
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
  GitFork,
  History,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useState, useMemo } from "react";
import { useUser } from "@/hooks/use-user";
import type { Catalogs, Documento, DocumentVersion } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { forceDownload } from "@/lib/utils";


const DocumentPreviewModal = dynamic(
  () => import('@/components/documents/document-preview-modal').then(mod => mod.DocumentPreviewModal),
  { ssr: false }
);


export default function DocumentoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.docId as string;
  const { user } = useUser();
  const hospitalId = user?.hospitalId;

  const [document, setDocument] = useState<Documento | null>(null);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [linkedDocuments, setLinkedDocuments] = useState<Documento[]>([]);
  const [mainDocument, setMainDocument] = useState<Documento | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentToPreview, setDocumentToPreview] = useState<Documento | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();


  useEffect(() => {
    if (hospitalId && docId) {
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        setPreviewUrl(null);
        try {
          const [docData, catalogsData, versionsData] = await Promise.all([
            getDocumentById(docId),
            getCatalogs(hospitalId),
            getDocumentVersions(docId),
          ]);
          
          if (!docData) {
            setError("Documento no encontrado.");
            setLoading(false);
            return;
          }

          setDocument(docData);
          setCatalogs(catalogsData);
          setVersions(versionsData);

          if (docData.fileExt?.toLowerCase() === 'pdf' && docData.downloadUrl) {
            const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(docData.downloadUrl)}&embedded=true`;
            setPreviewUrl(googleViewerUrl);
          }

          // Now fetch linked documents based on the docData
          const [linkedDocumentsData, mainDocData] = await Promise.all([
            getLinkedDocuments(docId, hospitalId),
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
    }
  }, [hospitalId, docId]);

  const canManage = user?.role === 'admin' || user?.role === 'editor';

  const groupedAndSortedLinkedDocuments = useMemo(() => {
    if (!linkedDocuments || linkedDocuments.length === 0 || !catalogs) {
      return [];
    }

    // Group documents by tipoDocumentoId
    const grouped = linkedDocuments.reduce((acc, doc) => {
      const tipoId = doc.tipoDocumentoId;
      if (!acc[tipoId]) {
        acc[tipoId] = [];
      }
      acc[tipoId].push(doc);
      return acc;
    }, {} as Record<string, Documento[]>);

    // Sort documents within each group and prepare for rendering
    const sortedAndNamedGroups = Object.keys(grouped).map(tipoId => {
      const tipoDoc = catalogs.tiposDocumento.find(t => t.id === tipoId);
      const sortedDocs = grouped[tipoId].sort((a, b) => {
        const dateA = a.fechaDocumento?.getTime() || 0;
        const dateB = b.fechaDocumento?.getTime() || 0;
        return dateB - dateA;
      });
      return {
        typeName: tipoDoc?.nombre || "Sin Tipo",
        typeOrder: tipoDoc?.orden || Infinity,
        documents: sortedDocs
      };
    });

    // Sort the groups themselves by the order defined in the catalog
    return sortedAndNamedGroups.sort((a, b) => a.typeOrder - b.typeOrder);

  }, [linkedDocuments, catalogs]);

  const handleVersionDownloadClick = async (version: DocumentVersion) => {
    if (!version.downloadUrl) {
        toast({ variant: "destructive", title: "Descarga fallida", description: "URL de la versión no encontrada." });
        return;
    }
    const filename = version.fileName || `${document?.titulo} (v${version.version}).${version.fileExt || document?.fileExt}`;
    toast({ title: "Iniciando descarga...", description: filename });
    await forceDownload(version.downloadUrl, filename);
  };

  if (loading) {
    return (
        <div className="mx-auto max-w-7xl space-y-8">
            {/* Header Skeleton */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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
                    <Skeleton className="h-[75vh] min-h-[600px] w-full" />
                </div>
                <div>
                    <Card>
                        <CardHeader>
                             <Skeleton className="h-10 w-full" /> {/* For TabsList */}
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <Skeleton className="h-6 w-1/4" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                        </CardContent>
                    </Card>
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

  const getVersionStatusName = (estadoDocId?: string) => {
    if (!estadoDocId || estadoDocId === "est-sus") return "Histórico";
  
    const estado = catalogs.estadosAcreditacionDoc.find((item: any) => item.id === estadoDocId);
    return estado?.nombre || "Histórico";
  };
      
  const isExpired = document.estadoDocId === 'est-vig' && document.fechaVigenciaHasta && document.fechaVigenciaHasta < new Date();
  const displayStatusName = isExpired ? 'Vencido' : getCatalogName("estadosAcreditacionDoc", document.estadoDocId);
  
  const getServicioNames = (servicioIds: string[] | undefined) => {
    if (!servicioIds || servicioIds.length === 0) return "No especificado";
    return servicioIds.map(id => getCatalogName("servicios", id)).join(", ");
  };

  const detailItems = [
    { icon: GitBranch, label: "Versión", value: document.version },
    { icon: ShieldCheck, label: "Estado", value: displayStatusName },
    { icon: ClipboardList, label: "Tipo", value: getCatalogName("tiposDocumento", document.tipoDocumentoId) },
    { icon: User, label: "Responsable", value: `${document.responsableNombre} (${document.responsableEmail})` },
    { icon: Building, label: "Servicios", value: getServicioNames(document.servicioIds) },
    { icon: Calendar, label: "Fecha Documento", value: format(document.fechaDocumento, "d 'de' MMMM, yyyy", { locale: es }) },
    { icon: Calendar, label: "Vigencia", value: document.fechaVigenciaDesde ? `${format(document.fechaVigenciaDesde, "dd/MM/yy")} - ${document.fechaVigenciaHasta ? format(document.fechaVigenciaHasta, "dd/MM/yy") : 'Indefinida'}` : 'No aplica' },
    { icon: Binary, label: "Tamaño", value: `${(document.fileSize / 1024).toFixed(2)} KB` },
  ];

  const renderPreview = () => {
    if (previewUrl) {
      return (
        <Card className="h-full">
            <CardContent className="p-0 h-[75vh] min-h-[600px] w-full">
                <iframe
                    src={previewUrl}
                    title={document.titulo}
                    className="w-full h-full border-0"
                />
            </CardContent>
        </Card>
      );
    }
    
    return (
        <Card className="h-full">
            <CardContent className="flex h-[75vh] min-h-[600px] flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 p-8 text-center">
                <FileText className="h-16 w-16 text-muted-foreground" />
                <p className="mt-4 text-lg font-semibold">
                  {document.fileName}
                </p>
                <p className="text-muted-foreground mt-2">
                  La previsualización solo está disponible para archivos PDF.
                </p>
                <Button 
                    className="mt-6"
                    onClick={async () => {
                      if (!document.downloadUrl) {
                          toast({ variant: "destructive", title: "Descarga fallida", description: "URL no encontrada." });
                          return;
                      }
                      toast({ title: "Iniciando descarga...", description: document.fileName });
                      await forceDownload(document.downloadUrl, document.fileName);
                    }}
                >
                    <Download className="mr-2 h-4 w-4" /> Descargar Archivo
                </Button>
            </CardContent>
        </Card>
    );
  };

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{document.titulo}</h1>
            <p className="max-w-prose text-muted-foreground">{document.descripcion}</p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <Button
              onClick={async () => {
                if (!document.downloadUrl) {
                  toast({ variant: "destructive", title: "Descarga fallida", description: "URL no encontrada." });
                  return;
                }
                toast({ title: "Iniciando descarga...", description: document.fileName });
                await forceDownload(document.downloadUrl, document.fileName);
              }}
            >
              <Download className="mr-2 h-4 w-4" /> Descargar
            </Button>
            {canManage && (
              <>
                <Button variant="outline" asChild>
                  <Link href={`/documentos/${document.id}/nueva-version`}>
                    <GitFork className="mr-2 h-4 w-4" /> Nueva Versión
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/documentos/${document.id}/editar`}>
                    <Edit className="mr-2 h-4 w-4" /> Editar
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column: Preview */}
          <div className="lg:col-span-2">
            {renderPreview()}
          </div>

          {/* Right Column: Details */}
          <div>
             <Card>
                <Tabs defaultValue="detalles" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="detalles">Detalles</TabsTrigger>
                        <TabsTrigger value="historial" disabled={versions.length === 0}>Historial</TabsTrigger>
                        <TabsTrigger value="vinculados" disabled={groupedAndSortedLinkedDocuments.length === 0 && !mainDocument}>Vinculados</TabsTrigger>
                        <TabsTrigger value="etiquetas" disabled={!document.tags || document.tags.length === 0}>Etiquetas</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="detalles" className="pt-6">
                        <CardContent>
                            <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2"><Info className="h-4 w-4"/>Detalles Generales</h3>
                            <div className="space-y-4">
                                {detailItems.map(item => (
                                <div key={item.label} className="flex items-start">
                                    <item.icon className="mr-3 h-4 w-4 flex-shrink-0 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                                        <p className="text-sm font-semibold">{item.value}</p>
                                    </div>
                                </div>
                                ))}
                            </div>
                             <h3 className="mt-8 mb-4 text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2"><ClipboardList className="h-4 w-4"/>Clasificación</h3>
                             <div className="space-y-3 text-sm">
                                <p><strong>Ámbito:</strong> {getCatalogName("ambitos", document.ambitoId)}</p>
                                <p><strong>Característica:</strong> {getCatalogName("caracteristicas", document.caracteristicaId)}</p>
                                <p><strong>Elem. Medible:</strong> {getCatalogName("elementosMedibles", document.elementoMedibleId)}</p>
                            </div>
                        </CardContent>
                    </TabsContent>
                    
                    <TabsContent value="historial" className="pt-6">
                        <CardContent>
                            <div className="space-y-2">
                                {versions.map(version => {
                                    const estadoNombre = getVersionStatusName(version.estadoDocId);

                                    const handlePreviewClick = () => {
                                      const previewDocForVersion: Documento = {
                                        id: version.id,
                                        hospitalId: version.hospitalId,
                                        titulo: version.titulo,
                                        descripcion: version.descripcion,
                                        tipoDocumentoId: version.tipoDocumentoId,
                                        version: version.version,
                                        estadoDocId: version.estadoDocId,
                                        ambitoId: version.ambitoId,
                                        caracteristicaId: version.caracteristicaId,
                                        elementoMedibleId: version.elementoMedibleId,
                                        servicioIds: version.servicioIds,
                                        responsableNombre: version.responsableNombre,
                                        responsableEmail: version.responsableEmail,
                                        fechaDocumento: version.fechaDocumento,
                                        fechaVigenciaDesde: version.fechaVigenciaDesde,
                                        fechaVigenciaHasta: version.fechaVigenciaHasta,
                                        fileName: version.fileName,
                                        fileExt: version.fileExt,
                                        mimeType: version.mimeType,
                                        fileSize: version.fileSize,
                                        storagePath: version.storagePath,
                                        downloadUrl: version.downloadUrl,
                                        checksum: version.checksum,
                                        tags: version.tags,
                                        linkedDocumentId: version.linkedDocumentId,
                                        createdByUid: version.createdByUid,
                                        createdByEmail: version.createdByEmail,
                                        createdAt: version.createdAt,
                                        updatedAt: version.updatedAt,
                                        isDeleted: false,
                                        searchKeywords: version.searchKeywords,
                                      };
                                      setDocumentToPreview(previewDocForVersion);
                                    };

                                    return (
                                      <div key={version.id} className="flex items-center justify-between rounded-md border bg-muted/20 p-3">
                                          <div className="flex items-center gap-3">
                                              <FileText className="h-5 w-5 text-muted-foreground"/>
                                              <div className="flex flex-col">
                                                  <div className="flex items-center gap-2">
                                                    <Link href={`/documentos/versiones/${version.id}`} className="font-medium text-sm hover:underline">
                                                      Versión {version.version}
                                                    </Link>
                                                    {estadoNombre && <Badge variant="secondary" className="text-xs">{estadoNombre}</Badge>}
                                                  </div>
                                                  <span className="text-xs text-muted-foreground">
                                                      Archivado {format(version.createdAt, "d 'de' MMMM, yyyy", { locale: es })}
                                                  </span>
                                              </div>
                                          </div>
                                          <div className="flex items-center">
                                              <Button variant="ghost" size="icon" onClick={handlePreviewClick} title="Ver versión">
                                                  <Eye className="h-4 w-4" />
                                              </Button>
                                              <Button variant="ghost" size="icon" onClick={() => handleVersionDownloadClick(version)} title="Descargar archivo de esta versión">
                                                  <Download className="h-4 w-4" />
                                              </Button>
                                          </div>
                                      </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </TabsContent>

                    <TabsContent value="vinculados" className="pt-6">
                        <CardContent>
                            <div className="space-y-6">
                                {mainDocument && (
                                    <div>
                                        <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Vinculado al Documento</h3>
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
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Descargar archivo"
                                                    onClick={async () => {
                                                        if (!mainDocument.downloadUrl) {
                                                            toast({ variant: "destructive", title: "Descarga fallida", description: "URL no encontrada." });
                                                            return;
                                                        }
                                                        toast({ title: "Iniciando descarga...", description: mainDocument.fileName });
                                                        await forceDownload(mainDocument.downloadUrl, mainDocument.fileName);
                                                    }}
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {groupedAndSortedLinkedDocuments.length > 0 && (
                                    <div>
                                        <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Documentos Vinculados a Éste</h3>
                                        <div className="space-y-4">
                                            {groupedAndSortedLinkedDocuments.map(group => (
                                                <div key={group.typeName}>
                                                    <h4 className="font-semibold text-sm mb-2">{group.typeName}</h4>
                                                    <div className="space-y-2">
                                                    {group.documents.map(linkedDoc => (
                                                        <div key={linkedDoc.id} className="flex items-center justify-between rounded-md border bg-muted/20 p-3">
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0"/>
                                                                <div className="flex flex-col overflow-hidden">
                                                                    <Link href={`/documentos/${linkedDoc.id}`} className="font-medium hover:underline text-sm truncate">
                                                                        {linkedDoc.titulo}
                                                                    </Link>
                                                                    <span className="text-xs text-muted-foreground truncate">
                                                                        v{linkedDoc.version} - {linkedDoc.fechaDocumento ? format(linkedDoc.fechaDocumento, "d MMM, yyyy", { locale: es }) : ''}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center flex-shrink-0">
                                                                <Button variant="ghost" size="icon" asChild>
                                                                    <Link href={`/documentos/${linkedDoc.id}`} title="Ver documento">
                                                                        <Eye className="h-4 w-4" />
                                                                    </Link>
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    title="Descargar archivo"
                                                                    onClick={async () => {
                                                                        if (!linkedDoc.downloadUrl) {
                                                                            toast({ variant: "destructive", title: "Descarga fallida", description: "URL no encontrada." });
                                                                            return;
                                                                        }
                                                                        toast({ title: "Iniciando descarga...", description: linkedDoc.fileName });
                                                                        await forceDownload(linkedDoc.downloadUrl, linkedDoc.fileName);
                                                                    }}
                                                                >
                                                                    <Download className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </TabsContent>

                    <TabsContent value="etiquetas" className="pt-6">
                        <CardContent className="flex flex-wrap gap-2">
                            {document.tags && document.tags.length > 0 ? (
                            document.tags.map((tag, i) => (
                                <Badge key={i} variant="secondary">{tag}</Badge>
                            ))
                            ) : (
                            <p className="text-sm text-muted-foreground">Sin etiquetas.</p>
                            )}
                        </CardContent>
                    </TabsContent>
                </Tabs>
             </Card>
          </div>
        </div>
      </div>

      <DocumentPreviewModal
        documento={documentToPreview}
        isOpen={!!documentToPreview}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDocumentToPreview(null);
          }
        }}
      />
    </>
  );
}
