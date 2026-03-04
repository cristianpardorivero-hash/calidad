import { getCatalogs, getDocumentById } from "@/lib/data";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";

export default async function DocumentoDetailPage({
  params,
}: {
  params: { docId: string };
}) {
  const [document, catalogs] = await Promise.all([
    getDocumentById(params.docId),
    getCatalogs("hcurepto"),
  ]);

  if (!document) {
    notFound();
  }

  const getCatalogName = (catalog: any, id: any) =>
    catalogs[catalog as keyof typeof catalogs]
      // @ts-ignore
      .find((item: any) => item.id === id)?.nombre || "N/A";

  const renderPDF = (url: string) => {
    // In a real app, `url` would be a secure download URL from Firebase Storage
    // For this mock, we can't embed a PDF.
    return (
      <div className="flex h-full min-h-[600px] w-full flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <p className="mt-4 text-center text-muted-foreground">
          La previsualización de PDF no está disponible en este entorno de
          demostración.
        </p>
        <Button asChild className="mt-4">
          <a href={url} download={document.fileName}>
            <Download className="mr-2 h-4 w-4" /> Descargar PDF
          </a>
        </Button>
      </div>
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
    { icon: Building, label: "Servicio", value: getCatalogName("servicios", document.servicioId) || 'No especificado' },
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
          <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Editar</Button>
          <Button><Download className="mr-2 h-4 w-4" /> Descargar</Button>
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
                    {document.fileExt === "pdf" ? renderPDF(document.downloadUrl) : renderOther(document.downloadUrl)}
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
                <p><strong>Punto Verif.:</strong> {getCatalogName("puntosVerificacion", document.puntoVerificacionId)}</p>
                <p><strong>Elem. Medible:</strong> {getCatalogName("elementosMedibles", document.elementoMedibleId)}</p>
            </CardContent>
          </Card>
          
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
