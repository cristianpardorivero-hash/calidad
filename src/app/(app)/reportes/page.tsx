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

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function ReportesPage() {
  const { user } = useUser();
  const hospitalId = user?.hospitalId;
  const userRole = user?.role;
  const servicioIds = user?.servicioIds;
  const servicioIdsDependency = useMemo(() => servicioIds?.join(',') ?? '', [servicioIds]);

  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  const [ambitoFilter, setAmbitoFilter] = useState('');
  const [servicioFilter, setServicioFilter] = useState('');
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
  
  const getCatalogName = (catalogKey: keyof Catalogs, id: string): string => {
    if (!catalogs || !id) return 'N/A';
    const catalog = catalogs[catalogKey] as { id: string; nombre: string }[];
    return catalog.find((item) => item.id === id)?.nombre || 'Desconocido';
  };


  const handleGeneratePdf = async () => {
    if (!catalogs) return;
    setGenerating(true);

    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    // Filter documents based on selection
    const filteredDocs = documents.filter(doc => {
        const ambitoMatch = !ambitoFilter || doc.ambitoId === ambitoFilter;
        const servicioMatch = !servicioFilter || doc.servicioIds?.includes(servicioFilter);
        return ambitoMatch && servicioMatch;
    });

    const doc = new jsPDF();

    // Add Title
    doc.setFontSize(18);
    doc.text('Reporte de Documentos del Sistema', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-CL')}`, 14, 30);

    // Add filter criteria
    let filterText = 'Filtros aplicados: ';
    if (ambitoFilter) {
      filterText += `Ámbito: ${getCatalogName('ambitos', ambitoFilter)}. `;
    }
    if (servicioFilter) {
      filterText += `Servicio: ${getCatalogName('servicios', servicioFilter)}.`;
    }
    if (!ambitoFilter && !servicioFilter) {
      filterText += 'Ninguno.';
    }
    doc.text(filterText, 14, 36);


    // Prepare data for table
    const tableColumn = ["Título", "Versión", "Tipo", "Estado"];
    const tableRows: (string | undefined)[][] = [];

    filteredDocs.forEach(doc => {
        const docData = [
            doc.titulo,
            doc.version,
            getCatalogName('tiposDocumento', doc.tipoDocumentoId),
            getCatalogName('estadosAcreditacionDoc', doc.estadoDocId),
        ];
        tableRows.push(docData);
    });

    // Add table to PDF
    doc.autoTable({
        startY: 45,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [34, 113, 239] },
    });

    // Save the PDF
    doc.save('reporte_documentos.pdf');

    setGenerating(false);
  };

  const pageHeader = (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
      <p className="text-muted-foreground">
        Genere reportes en PDF de los documentos del sistema.
      </p>
    </div>
  );
  
  if (loading || !catalogs) {
    return (
        <div className="space-y-8">
            {pageHeader}
            <Card className="mx-auto max-w-2xl">
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

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Configuración del Reporte</CardTitle>
          <CardDescription>
            Seleccione los filtros para generar su reporte de documentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="ambito-select" className="text-sm font-medium">Ámbito</label>
            <Select value={ambitoFilter} onValueChange={(value) => setAmbitoFilter(value === 'all' ? '' : value)}>
              <SelectTrigger id="ambito-select">
                <SelectValue placeholder="Todos los ámbitos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los ámbitos</SelectItem>
                {catalogs.ambitos.filter(item => item.id).map(ambito => (
                  <SelectItem key={ambito.id} value={ambito.id}>
                    {ambito.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="servicio-select" className="text-sm font-medium">Servicio</label>
            <Select value={servicioFilter} onValueChange={(value) => setServicioFilter(value === 'all' ? '' : value)}>
              <SelectTrigger id="servicio-select">
                <SelectValue placeholder="Todos los servicios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los servicios</SelectItem>
                {catalogs.servicios.filter(item => item.id).map(servicio => (
                  <SelectItem key={servicio.id} value={servicio.id}>
                    {servicio.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
