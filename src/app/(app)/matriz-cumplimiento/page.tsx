'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser } from '@/hooks/use-user';
import type { Catalogs, Documento, UserRole, Servicio } from '@/lib/types';
import { getCatalogs, getDocuments } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { ComplianceMatrix } from '@/components/matriz/compliance-matrix';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';


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
  const [selectedServicioIds, setSelectedServicioIds] = useState<string[]>([]);

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
          setSelectedServicioIds(catalogsData.servicios.map(s => s.id));
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

  const allServicios = useMemo(() => {
    if (!catalogs) return [];
    return [...catalogs.servicios].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [catalogs]);

  const filteredServicios = useMemo(() => {
    return allServicios.filter(s => selectedServicioIds.includes(s.id));
  }, [selectedServicioIds, allServicios]);


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
      allServicios.forEach(serv => {
        const relevantDocs = documents.filter(
          doc => doc.elementoMedibleId === elem.id && doc.servicioIds?.includes(serv.id) && !doc.isDeleted
        );
        data[elem.id][serv.id] = getStatus(relevantDocs);
      });
    });
    return data;
  }, [documents, catalogs, allServicios]);

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
    
    // Legend
    yPos += 20;
    doc.setFontSize(11).setTextColor(0);
    doc.text('Leyenda de Colores:', 14, yPos);
    yPos += 7;

    type CellStatusWithNA = CellStatus | 'noAplica';
    const legendColors: Record<CellStatusWithNA, { label: string, color: [number, number, number] }> = {
        vigente: { label: 'Vigente', color: [220, 252, 231] },
        proximo_vencer: { label: 'Próximo a Vencer', color: [254, 249, 195] },
        vencido: { label: 'Vencido', color: [254, 226, 226] },
        inexistente: { label: 'Inexistente', color: [241, 245, 249] },
        noAplica: { label: 'No Aplica', color: [249, 250, 251] }
    };
    
    Object.values(legendColors).forEach(item => {
        doc.setFillColor(item.color[0], item.color[1], item.color[2]);
        doc.rect(20, yPos - 4, 5, 5, 'F');
        doc.setTextColor(0);
        doc.text(item.label, 30, yPos);
        yPos += 7;
    });

    doc.addPage();
    let currentY = 20;
  
    for (const ambito of groupedStructure) {
      if (currentY > pageHeight - 30) { doc.addPage(); currentY = 20; }
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(`Ámbito: ${ambito.nombre}`, 14, currentY);
      currentY += 10;
  
      for (const caracteristica of ambito.caracteristicas) {
        if (currentY > pageHeight - 30) { doc.addPage(); currentY = 20; }
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text(`Característica: ${caracteristica.codigo} - ${caracteristica.nombre}`, 14, currentY);
        currentY += 8;
  
        const tableHead = [['Elemento Medible', ...filteredServicios.map(s => s.nombre)]];
        const tableBody = caracteristica.elementos.map((elem: any) => {
          const row = [`${elem.codigo} ${elem.nombre}`];
          filteredServicios.forEach(serv => {
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
          startY: currentY,
          theme: 'grid',
          headStyles: { fillColor: [41, 107, 219], textColor: 255, fontSize: 8, halign: 'center' },
          bodyStyles: { fontSize: 7, cellPadding: 1.5, halign: 'center', lineWidth: 0.1, lineColor: [226, 232, 240] },
          columnStyles: { 0: { cellWidth: 60, halign: 'left', fontStyle: 'bold' } },
          didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index > 0) {
              const elem = caracteristica.elementos[data.row.index];
              const serv = filteredServicios[data.column.index - 1];
              let status: CellStatusWithNA = 'noAplica';
  
              if (elem && serv && elem.servicioIds?.includes(serv.id)) {
                const cellData = matrixData[elem.id]?.[serv.id];
                status = cellData?.status || 'inexistente';
              }
  
              const color = legendColors[status].color;
              doc.setFillColor(color[0], color[1], color[2]);
              doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
  
              const text = String(data.cell.raw ?? '');
              const textPos = data.cell.getTextPos();
              doc.setTextColor(30, 30, 30); // Dark grey for text
              doc.text(text, textPos.x, textPos.y, {
                halign: 'center',
                valign: 'middle'
              });
            }
          },
          didDrawPage: (data: any) => {
            doc.setFontSize(10).setTextColor(100);
            doc.text(`Matriz de Cumplimiento - ${user.hospitalId}`, 14, 15);
            
            const pageCount = (doc.internal as any).getNumberOfPages();
            doc.setFontSize(8).setTextColor(150);
            doc.text(`Página ${data.pageNumber} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
          }
        });
        currentY = (doc as any).previousAutoTable.finalY + 10;
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
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
              <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtrar Servicios ({selectedServicioIds.length} / {allServicios.length})
              </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="end">
              <div className="p-2 border-b">
                  <p className="text-sm font-semibold">Seleccionar Servicios</p>
              </div>
              <ScrollArea className="h-64">
                  <div className="p-4 space-y-2">
                      {allServicios.map((servicio) => (
                          <div key={servicio.id} className="flex items-center space-x-2">
                              <Checkbox
                                  id={`servicio-${servicio.id}`}
                                  checked={selectedServicioIds.includes(servicio.id)}
                                  onCheckedChange={(checked) => {
                                      setSelectedServicioIds(prev =>
                                          checked
                                          ? [...prev, servicio.id]
                                          : prev.filter(id => id !== servicio.id)
                                      );
                                  }}
                              />
                              <label
                                  htmlFor={`servicio-${servicio.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                  {servicio.nombre}
                              </label>
                          </div>
                      ))}
                  </div>
              </ScrollArea>
          </PopoverContent>
        </Popover>
        <Button onClick={handleGeneratePdf} disabled={generatingPdf || loading}>
          {generatingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
              <FileDown className="mr-2 h-4 w-4" />
          )}
          Generar PDF
        </Button>
      </div>
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
        sortedServicios={filteredServicios}
      />
    </div>
  );
}
