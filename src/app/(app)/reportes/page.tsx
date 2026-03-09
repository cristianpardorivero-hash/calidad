'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@/hooks/use-user';
import type { Catalogs, Documento } from '@/lib/types';
import { getCatalogs, getDocuments } from '@/lib/data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSearchParams } from 'next/navigation';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Separator } from '@/components/ui/separator';

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    previousAutoTable: {
        finalY: number;
    };
  }
}

export default function ReportesPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const hospitalId = user?.hospitalId;
  const userRole = user?.role;
  const servicioIds = user?.servicioIds;
  const servicioIdsDependency = useMemo(() => servicioIds?.join(',') ?? '', [servicioIds]);

  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  // Report config states
  const [reportType, setReportType] = useState('general');
  const [ambitoFilter, setAmbitoFilter] = useState('');
  const [caracteristicaFilter, setCaracteristicaFilter] = useState('');
  const [elementoMedibleFilter, setElementoMedibleFilter] = useState('');
  const [servicioFilter, setServicioFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (hospitalId) {
      setLoading(true);
      Promise.all([
        getCatalogs(hospitalId),
        getDocuments(hospitalId, userRole, servicioIds),
      ])
        .then(([catalogsData, documentsData]) => {
          setCatalogs(catalogsData);
          setDocuments(documentsData);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Failed to fetch data:', error);
          setLoading(false);
        });
    } else if (!user) {
      setLoading(false);
    }
  }, [hospitalId, userRole, servicioIdsDependency, user]);

  const filteredCaracteristicas = useMemo(() => {
    if (!ambitoFilter || !catalogs) return [];
    return catalogs.caracteristicas.filter(c => c.ambitoId === ambitoFilter).sort((a,b) => a.orden - b.orden);
  }, [ambitoFilter, catalogs]);

  const filteredElementosMedibles = useMemo(() => {
    if (!caracteristicaFilter || !catalogs) return [];
    return catalogs.elementosMedibles.filter(e => e.caracteristicaId === caracteristicaFilter).sort((a,b) => a.orden - b.orden);
  }, [caracteristicaFilter, catalogs]);
  
  const getCatalogName = (catalogKey: keyof Catalogs, id: string): string => {
    if (!catalogs || !id) return 'N/A';
    const catalog = catalogs[catalogKey] as { id: string; nombre: string }[];
    return catalog.find((item) => item.id === id)?.nombre || 'Desconocido';
  };

  const handleGeneratePdf = async () => {
    if (!catalogs || !user) return;
    setGenerating(true);

    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    // 1. Filter documents based on UI state
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const fromDate = fromParam ? new Date(fromParam) : null;
    const toDate = toParam ? new Date(toParam) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999); // Include the whole day

    const filteredDocs = documents.filter(doc => {
        const ambitoMatch = !ambitoFilter || doc.ambitoId === ambitoFilter;
        const caracteristicaMatch = !caracteristicaFilter || doc.caracteristicaId === caracteristicaFilter;
        const elementoMedibleMatch = !elementoMedibleFilter || doc.elementoMedibleId === elementoMedibleFilter;
        const servicioMatch = !servicioFilter || doc.servicioIds?.includes(servicioFilter);
        const estadoMatch = !estadoFilter || doc.estadoDocId === estadoFilter;
        const dateMatch = (!fromDate || (doc.fechaDocumento && doc.fechaDocumento >= fromDate)) &&
                          (!toDate || (doc.fechaDocumento && doc.fechaDocumento <= toDate));
        
        return ambitoMatch && caracteristicaMatch && elementoMedibleMatch && servicioMatch && estadoMatch && dateMatch;
    });

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

    // 2. Add Cover Page
    doc.setFontSize(18);
    doc.text('Reporte de Documentos', pageWidth / 2, 40, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Hospital: ${user.hospitalId}`, pageWidth / 2, 50, { align: 'center' });
    doc.text(`Generado el: ${new Date().toLocaleString('es-CL')}`, pageWidth / 2, 60, { align: 'center' });
    doc.text(`Tipo de Reporte: ${reportType === 'general' ? 'Listado Maestro de Documentos' : 'Reporte de Vencimientos'}`, pageWidth / 2, 70, { align: 'center' });
    
    let yPos = 90;
    doc.setFontSize(11);
    doc.text('Filtros Aplicados:', 14, yPos);
    yPos += 7;

    const addFilterLine = (label: string, value: string | null | undefined) => {
        if (value) {
            doc.text(`- ${label}: ${value}`, 20, yPos);
            yPos += 7;
        }
    };

    addFilterLine('Ámbito', getCatalogName('ambitos', ambitoFilter));
    addFilterLine('Característica', getCatalogName('caracteristicas', caracteristicaFilter));
    addFilterLine('Elemento Medible', getCatalogName('elementosMedibles', elementoMedibleFilter));
    addFilterLine('Servicio', getCatalogName('servicios', servicioFilter));
    addFilterLine('Estado', getCatalogName('estadosAcreditacionDoc', estadoFilter));
    addFilterLine('Fecha Desde', fromParam);
    addFilterLine('Fecha Hasta', toParam);
    
    doc.text(`Total de Documentos: ${filteredDocs.length}`, 14, yPos + 10);
    
    doc.addPage();

    // 3. Generate content based on report type
    let finalDocs = filteredDocs;
    let tableHead: string[] = [];
    let tableBody: (string | undefined)[][] = [];

    if (reportType === 'general') {
        finalDocs.sort((a, b) => {
            const ambitoOrderA = catalogs.ambitos.find(am => am.id === a.ambitoId)?.orden ?? Infinity;
            const ambitoOrderB = catalogs.ambitos.find(am => am.id === b.ambitoId)?.orden ?? Infinity;
            if (ambitoOrderA !== ambitoOrderB) return ambitoOrderA - ambitoOrderB;
            return (a.fechaDocumento?.getTime() || 0) - (b.fechaDocumento?.getTime() || 0);
        });

        tableHead = ["Título", "Tipo", "Versión", "Fecha Documento", "Vigencia", "Estado"];
        tableBody = finalDocs.map(d => {
            const vigencia = d.fechaVigenciaDesde
                ? `${format(d.fechaVigenciaDesde, "dd/MM/yy")} - ${d.fechaVigenciaHasta ? format(d.fechaVigenciaHasta, "dd/MM/yy") : 'Indef.'}`
                : 'No aplica';
            return [
                d.titulo,
                getCatalogName('tiposDocumento', d.tipoDocumentoId),
                d.version,
                d.fechaDocumento ? format(d.fechaDocumento, 'dd/MM/yyyy') : 'N/A',
                vigencia,
                getCatalogName('estadosAcreditacionDoc', d.estadoDocId)
            ];
        });
    } else if (reportType === 'vencimiento') {
        const now = new Date();
        const ninetyDays = new Date();
        ninetyDays.setDate(now.getDate() + 90);
        finalDocs = filteredDocs
            .filter(d => d.fechaVigenciaHasta && d.fechaVigenciaHasta <= ninetyDays)
            .sort((a,b) => (a.fechaVigenciaHasta?.getTime() || 0) - (b.fechaVigenciaHasta?.getTime() || 0));

        tableHead = ["Título", "Versión", "Responsable", "Fecha Vencimiento", "Estado"];
        tableBody = finalDocs.map(d => {
            const isExpired = d.fechaVigenciaHasta! < now;
            return [
                d.titulo,
                d.version,
                d.responsableNombre,
                d.fechaVigenciaHasta ? format(d.fechaVigenciaHasta, 'dd/MM/yyyy') : 'N/A',
                isExpired ? 'Vencido' : 'Por Vencer'
            ];
        });
    }
    
    doc.autoTable({
        head: [tableHead],
        body: tableBody,
        startY: 20,
        theme: 'striped',
        headStyles: { fillColor: [34, 113, 239], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        didDrawPage: (data) => {
            // Header
            doc.setFontSize(10);
            doc.setTextColor(40);
            doc.text(`Reporte - Hospital ${user.hospitalId}`, data.settings.margin.left, 15);
        }
    });

    // 4. Add Page Numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    doc.save(`reporte_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
    setGenerating(false);
  };

  const pageHeader = (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Generación de Reportes</h1>
      <p className="text-muted-foreground">
        Configure y genere reportes en PDF de los documentos del sistema.
      </p>
    </div>
  );
  
  if (loading || !catalogs) {
    return (
        <div className="space-y-8">
            {pageHeader}
            <Card className="mx-auto max-w-3xl">
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-10 w-36 ml-auto" />
                </CardFooter>
            </Card>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      {pageHeader}

      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Configuración del Reporte</CardTitle>
          <CardDescription>
            Seleccione el tipo de reporte y los filtros para generar su documento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className='space-y-2'>
                <label className="text-sm font-medium">Tipo de Reporte</label>
                <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="general">Listado Maestro de Documentos</SelectItem>
                        <SelectItem value="vencimiento">Reporte de Vencimientos</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            <Separator />
            <h3 className="text-md font-semibold">Filtros Avanzados</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Ámbito</label>
                    <Select value={ambitoFilter} onValueChange={(v) => { setAmbitoFilter(v === 'all' ? '' : v); setCaracteristicaFilter(''); setElementoMedibleFilter(''); }}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los ámbitos</SelectItem>
                        {catalogs.ambitos.map(item => <SelectItem key={item.id} value={item.id}>{item.nombre}</SelectItem>)}
                    </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Característica</label>
                    <Select value={caracteristicaFilter} onValueChange={(v) => { setCaracteristicaFilter(v === 'all' ? '' : v); setElementoMedibleFilter(''); }} disabled={!ambitoFilter}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las características</SelectItem>
                        {filteredCaracteristicas.map(item => <SelectItem key={item.id} value={item.id}>{item.codigo} - {item.nombre}</SelectItem>)}
                    </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Elemento Medible</label>
                    <Select value={elementoMedibleFilter} onValueChange={(v) => setElementoMedibleFilter(v === 'all' ? '' : v)} disabled={!caracteristicaFilter}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los elementos</SelectItem>
                        {filteredElementosMedibles.map(item => <SelectItem key={item.id} value={item.id}>{item.codigo} - {item.nombre}</SelectItem>)}
                    </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Servicio</label>
                    <Select value={servicioFilter} onValueChange={(v) => setServicioFilter(v === 'all' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los servicios</SelectItem>
                        {catalogs.servicios.map(item => <SelectItem key={item.id} value={item.id}>{item.nombre}</SelectItem>)}
                    </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Estado</label>
                    <Select value={estadoFilter} onValueChange={(v) => setEstadoFilter(v === 'all' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        {catalogs.estadosAcreditacionDoc.map(item => <SelectItem key={item.id} value={item.id}>{item.nombre}</SelectItem>)}
                    </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                     <label className="text-sm font-medium">Fecha del Documento</label>
                    <DateRangePicker />
                </div>
            </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGeneratePdf} disabled={generating} className="ml-auto">
            {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <FileDown className="mr-2 h-4 w-4" />
            )}
            Generar PDF
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
