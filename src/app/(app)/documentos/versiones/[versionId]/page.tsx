'use client';

import { getDocumentVersionById, getDocumentById } from "@/lib/data";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Download,
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
  Archive,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import type { Catalogs, Documento, DocumentVersion } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getCatalogs } from "@/lib/data";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const DocumentPreviewModal = dynamic(
  () => import('@/components/documents/document-preview-modal').then(mod => mod.DocumentPreviewModal),
  { ssr: false }
);

export default function VersionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const versionId = params.versionId as string;
  const { user } = useUser();
  const hospitalId = user?.hospitalId;

  const [version, setVersion] = useState<DocumentVersion | null>(null);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentToPreview, setDocumentToPreview] = useState<Documento | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (hospitalId && versionId) {
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        setPreviewUrl(null);
        try {
          const [versionData, catalogsData] = await Promise.all([
            getDocumentVersionById(versionId),
            getCatalogs(hospitalId),
          ]);
          
          if (!versionData) {
            setError("Versión del documento no encontrada.");
            setLoading(false);
            return;
          }
          setVersion(versionData);
          setCatalogs(catalogsData);

          if (versionData.fileExt?.toLowerCase() === 'pdf' && versionData.downloadUrl) {
            const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(versionData.downloadUrl)}&embedded=true`;
            setPreviewUrl(googleViewerUrl);
          }

        } catch (err) {
          console.error(err);
          setError("Error al cargar la versión del documento.");
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [hospitalId, versionId]);

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
                    <Skeleton className="h-[75vh] min-h-[600px] w-full" />
                </div>
                <div className="space-y-8">
                    <Card><CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader><CardContent className="space-y-4">{Array.from({length: 4}).map((_,i) => <Skeleton key={i} className="h-8 w-full" />)}</CardContent></Card>
                    <Card><CardHeader><Skeleton className="h-6 w-2/4" /></CardHeader><CardContent className="space-y-2">{Array.from({length: 3}).map((_,i) => <Skeleton key={i} className="h-5 w-full" />)}</CardContent></Card>
                </div>
            </div>
        </div>
    );
  }

  if (error || !version || !catalogs) {
    return <div className="text-center text-destructive">{error || "No se pudo cargar la versión del documento."}</div>;
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
    
  const getServicioNames = (servicioIds: string[] | undefined) => {
    if (!servicioIds || servicioIds.length === 0) return "No especificado";
    return servicioIds.map(id => getCatalogName("servicios", id)).join(", ");
  };

  const detailItems = [
    { icon: GitBranch, label: "Versión", value: version.version },
    { icon: ShieldCheck, label: "Estado", value: getVersionStatusName(version.estadoDocId) },
    { icon: ClipboardList, label: "Tipo", value: getCatalogName("tiposDocumento", version.tipoDocumentoId) },
    { icon: User, label: "Responsable", value: `${version.responsableNombre} (${version.responsableEmail})` },
    { icon: Building, label: "Servicios", value: getServicioNames(version.servicioIds) },
    { icon: Calendar, label: "Fecha Documento", value: format(version.fechaDocumento, "d 'de' MMMM, yyyy", { locale: es }) },
    { icon: Calendar, label: "Vigencia", value: version.fechaVigenciaDesde ? `${format(version.fechaVigenciaDesde, "dd/MM/yy")} - ${version.fechaVigenciaHasta ? format(version.fechaVigenciaHasta, "dd/MM/yy") : 'Indefinida'}` : 'No aplica' },
    { icon: Binary, label: "Tamaño", value: `${(version.fileSize / 1024).toFixed(2)} KB` },
    { icon: Archive, label: "Archivado el", value: format(version.createdAt, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es }) },
  ];
  
  // Create a Documento-like object for the preview modal
  const previewableDocument = {
    ...version,
    id: version.id, 
    downloadUrl: version.downloadUrl,
    fileName: version.fileName,
    titulo: version.titulo,
    fileExt: version.fileExt
  } as Documento;

  const renderPreview = () => {
    if (previewUrl) {
      return (
        <Card className="h-full">
            <CardContent className="p-0 h-[75vh] min-h-[600px] w-full">
                <iframe
                    src={previewUrl}
                    title={version.titulo}
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
                  {version.fileName}
                </p>
                <p className="text-muted-foreground mt-2">
                  La previsualización solo está disponible para archivos PDF.
                </p>
                <Button asChild className="mt-6">
                    <a href={version.downloadUrl} download={version.fileName}>
                        <Download className="mr-2 h-4 w-4" /> Descargar Archivo
                    </a>
                </Button>
            </CardContent>
        </Card>
    );
  };

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-8">
        <Alert variant="default" className="bg-amber-50 border-amber-300 dark:bg-amber-950 dark:border-amber-700">
          <AlertTriangle className="h-4 w-4 !text-amber-600 dark:!text-amber-400" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">Estás viendo una versión histórica</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            Esta es una vista de solo lectura del documento tal como fue archivado. No se pueden realizar cambios.
          </AlertDescription>
        </Alert>

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{version.titulo}</h1>
            <p className="max-w-prose text-muted-foreground">{version.descripcion}</p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap justify-end gap-2">
            <Button variant="outline" asChild>
                <Link href={`/documentos/${version.docId}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al Documento Actual
                </Link>
            </Button>
            <Button variant="outline" onClick={() => setDocumentToPreview(previewableDocument)}>
              <Eye className="mr-2 h-4 w-4" /> Ver en Modal
            </Button>
            <Button asChild>
              <a href={version.downloadUrl} download={version.fileName}>
                <Download className="mr-2 h-4 w-4" /> Descargar Archivo
              </a>
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {renderPreview()}
          </div>

          {/* Right Column: Details */}
          <div className="space-y-8">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Info className="h-5 w-5"/> Detalles de la Versión</CardTitle></CardHeader>
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
                  <p><strong>Ámbito:</strong> {getCatalogName("ambitos", version.ambitoId)}</p>
                  <p><strong>Característica:</strong> {getCatalogName("caracteristicas", version.caracteristicaId)}</p>
                  <p><strong>Elem. Medible:</strong> {getCatalogName("elementosMedibles", version.elementoMedibleId)}</p>
              </CardContent>
            </Card>

             {version.tags && version.tags.length > 0 && (
                <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Tags className="h-5 w-5"/> Etiquetas</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    {version.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary">{tag}</Badge>
                    ))}
                </CardContent>
                </Card>
            )}
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
