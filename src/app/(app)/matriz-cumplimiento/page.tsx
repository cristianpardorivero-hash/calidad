'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser } from '@/hooks/use-user';
import type { Catalogs, Documento, UserRole, Servicio } from '@/lib/types';
import { getCatalogs, getDocuments } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { ComplianceMatrix } from '@/components/matriz/compliance-matrix';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';

// Declaration for jspdf-autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    previousAutoTable: {
        finalY: number;
    };
  }
}

type CellStatus = 'vigente' | 'proximo_vencer' | 'vencido' | 'inexistente';

interface MatrixData {
  [elementoMedibleId: string]: {
    [servicioId: string]: {
      status: CellStatus;
      count: number;
    };
  };
}

const getStatus = (docs: Documento[]): { status: CellStatus; count: number } => {
  if (docs.length === 0) {
    return { status: 'inexistente', count: 0 };
  }

  const now = new Date();
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(now.getDate() + 90);

  const vigentes = docs.filter(d => d.estadoDocId === 'est-vig' && (!d.fechaVigenciaHasta || d.fechaVigenciaHasta >= now));
  if (vigentes.length > 0) {
    return { status: 'vigente', count: docs.length };
  }

  const proximosAVencer = docs.filter(d => d.estadoDocId === 'est-vig' && d.fechaVigenciaHasta && d.fechaVigenciaHasta >= now && d.fechaVigenciaHasta <= ninetyDaysFromNow);
  if (proximosAVencer.length > 0) {
    return { status: 'proximo_vencer', count: docs.length };
  }
  
  const vencidos = docs.filter(d => d.estadoDocId === 'est-vig' && d.fechaVigenciaHasta && d.fechaVigenciaHasta < now);
  if (vencidos.length > 0) {
    return { status: 'vencido', count: docs.length };
  }

  // If there are docs but none are 'vigente' (e.g. all are 'historico')
  return { status: 'inexistente', count: docs.length };
};


export default function MatrizCumplimientoPage() {
  const { user } = useUser();
  const hospitalId = user?.hospitalId;
  const userRole = user?.role as UserRole | undefined;
  
  const servicioIds = useMemo(() => user?.servicioIds, [user?.servicioIds]);

  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

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
          console.error('Failed to fetch compliance data:', error);
          setLoading(false);
        });
    } else if (!user) {
        setLoading(false);
    }
  }, [hospitalId, userRole, servicioIds, user]);

  const sortedServicios = useMemo(() => {
    if (!catalogs) return [];
    return [...catalogs.servicios].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [catalogs]);

  const groupedStructure = useMemo(() => {
    if (!catalogs) return [];
    const ambitos = [...catalogs.ambitos].sort((a, b) => a.orden - b.orden);
    return ambitos.map(ambito => {
      const caracteristicas = [...catalogs.caracteristicas]
        .filter(c => c.ambitoId === ambito.id)
        .sort((a, b) => a.orden - b.orden);
      
      const caracteristicasConElementos = caracteristicas.map(caracteristica => {
        const elementos = [...catalogs.elementosMedibles]
          .filter(e => e.caracteristicaId === caracteristica.id)
          .sort((a, b) => a.orden - b.orden);
        return { ...caracteristica, elementos };
      }).filter(c => c.elementos.length > 0); 

      return { ...ambito, caracteristicas: caracteristicasConElementos };
    }).filter(a => a.caracteristicas.length > 0);

  }, [catalogs]);

  const matrixData = useMemo<MatrixData>(() => {
    if (!catalogs) return {};
    const data: MatrixData = {};
    catalogs.elementosMedibles.forEach(elem => {
      data[elem.id] = {};
      sortedServicios.forEach(serv => {
        const relevantDocs = documents.filter(
          doc => doc.elementoMedibleId === elem.id && doc.servicioIds?.includes(serv.id) && !doc.isDeleted
        );
        data[elem.id][serv.id] = getStatus(relevantDocs);
      });
    });
    return data;
  }, [documents, catalogs, sortedServicios]);

  const handleGeneratePdf = async () => {
    if (!catalogs || !user || !groupedStructure) return;
    setGeneratingPdf(true);

    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    
    type jsPDFWithAutoTable = jsPDF & { autoTable: (options: any) => jsPDFWithAutoTable, previousAutoTable: { finalY: number } };
    const doc = new jsPDF('l', 'mm', 'a4') as jsPDFWithAutoTable;

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Header
    doc.setFontSize(16).text('Matriz de Cumplimiento', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    doc.setFontSize(11).text(`Hospital: ${user.hospitalId}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    doc.setFontSize(9).setTextColor(100).text(`Generado el: ${new Date().toLocaleString('es-CL')}`, pageWidth / 2, yPos, { align: 'center' });
    yPos = 50;

    for (const ambito of groupedStructure) {
        if (yPos > pageHeight - 40) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text(`Ámbito: ${ambito.nombre}`, 14, yPos);
        yPos += 10;

        for (const caracteristica of ambito.caracteristicas) {
            if (yPos > pageHeight - 40) { doc.addPage(); yPos = 20; }
            doc.setFontSize(12);
            doc.setTextColor(40);
            doc.text(`Característica: ${caracteristica.codigo} - ${caracteristica.nombre}`, 14, yPos);
            yPos += 8;

            const tableHead = [['Elemento Medible', ...sortedServicios.map(s => s.nombre)]];
            const tableBody = caracteristica.elementos.map(elem => {
                const row = [`${elem.codigo} ${elem.nombre}`];
                sortedServicios.forEach(serv => {
                    if (elem.servicioIds?.includes(serv.id)) {
                        const cellData = matrixData[elem.id]?.[serv.id];
                        row.push(cellData?.count > 0 ? String(cellData.count) : '0');
                    } else {
                        row.push('N/A');
                    }
                });
                return row;
            });
            
            doc.autoTable({
                head: tableHead,
                body: tableBody,
                startY: yPos,
                theme: 'striped',
                headStyles: { fillColor: [34, 113, 239], fontSize: 8, halign: 'center' },
                bodyStyles: { fontSize: 7, cellPadding: 1.5, halign: 'center' },
                columnStyles: { 0: { cellWidth: 60, halign: 'left' } },
                didDrawPage: (data: any) => {
                    const pageCount = (doc.internal as any).getNumberOfPages();
                    doc.setFontSize(8).setTextColor(150);
                    doc.text(`Página ${data.pageNumber} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                }
            });
            yPos = doc.previousAutoTable.finalY + 10;
        }
    }

    doc.save(`matriz_cumplimiento_${new Date().toISOString().split('T')[0]}.pdf`);
    setGeneratingPdf(false);
  };


  const pageHeader = (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Matriz de Cumplimiento</h1>
        <p className="text-muted-foreground">
          Visualiza el estado de la documentación por elemento medible y servicio.
        </p>
      </div>
      <Button onClick={handleGeneratePdf} disabled={generatingPdf || loading}>
        {generatingPdf ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
            <FileDown className="mr-2 h-4 w-4" />
        )}
        Generar PDF
      </Button>
    </div>
  );
  
  if (loading || !catalogs) {
    return (
        <div className="space-y-8">
            {pageHeader}
            <div className="space-y-4">
              <Skeleton className="h-10 w-1/4" />
              <Skeleton className="h-96 w-full" />
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      {pageHeader}
      <ComplianceMatrix 
        catalogs={catalogs}
        groupedStructure={groupedStructure}
        matrixData={matrixData}
        sortedServicios={sortedServicios}
      />
    </div>
  );
}
