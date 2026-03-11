'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { Documento, Catalogs } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card } from '../ui/card';

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

const statusConfig: { [key in CellStatus]: { label: string; className: string } } = {
  vigente: { label: 'Vigente', className: 'bg-green-100 dark:bg-green-900/50 hover:bg-green-200 dark:hover:bg-green-800/60 border-green-500' },
  proximo_vencer: { label: 'Próximo a Vencer', className: 'bg-yellow-100 dark:bg-yellow-900/50 hover:bg-yellow-200 dark:hover:bg-yellow-800/60 border-yellow-500' },
  vencido: { label: 'Vencido', className: 'bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800/60 border-red-500' },
  inexistente: { label: 'Inexistente', className: 'bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/60 border-slate-400' },
};

export function ComplianceMatrix({ documents, catalogs }: { documents: Documento[]; catalogs: Catalogs }) {
  const sortedServicios = useMemo(() => {
    return [...catalogs.servicios].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [catalogs.servicios]);

  const groupedStructure = useMemo(() => {
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

  }, [catalogs.ambitos, catalogs.caracteristicas, catalogs.elementosMedibles]);

  const matrixData = useMemo<MatrixData>(() => {
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
  }, [documents, catalogs.elementosMedibles, sortedServicios]);
  
  if (groupedStructure.length === 0) {
    return (
        <Card>
            <div className="p-6">
                <h3 className="text-lg font-semibold">Sin Datos</h3>
                <p className="text-sm text-muted-foreground">No hay características o elementos medibles definidos en los catálogos para mostrar la matriz.</p>
            </div>
        </Card>
    );
  }

  const createQueryString = (elementoMedibleId: string, servicioId: string) => {
    const params = new URLSearchParams();
    params.set('elementoMedibleId', elementoMedibleId);
    params.set('servicioId', servicioId);
    return params.toString();
  }

  return (
    <TooltipProvider>
      <Accordion type="multiple" collapsible className="w-full space-y-4">
        {groupedStructure.map((ambito) => (
          <AccordionItem value={ambito.id} key={ambito.id} className="border rounded-lg bg-card shadow-sm">
            <AccordionTrigger className="p-4 text-lg font-semibold hover:no-underline">
              {ambito.nombre}
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-0">
              <Accordion type="multiple" collapsible className="w-full space-y-3">
                {ambito.caracteristicas.map((caracteristica) => (
                  <AccordionItem value={caracteristica.id} key={caracteristica.id} className="border rounded-md bg-background">
                    <AccordionTrigger className="px-4 py-3 text-md font-medium text-left hover:no-underline">
                      <div className='flex items-start gap-2'>
                        <Badge variant="secondary" className="font-mono mt-1">{caracteristica.codigo}</Badge>
                        <span>{caracteristica.nombre}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-4 pt-4 border-t">
                        {caracteristica.elementos.map((elem) => (
                          <div key={elem.id} className="p-4 rounded-lg border bg-muted/30">
                            <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                              <Badge variant="outline" className="font-mono">{elem.codigo}</Badge>
                              {elem.nombre}
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                              {sortedServicios.map((servicio) => {
                                const isApplicable = elem.servicioIds?.includes(servicio.id);
                                if (!isApplicable) return null;

                                const cellData = matrixData[elem.id]?.[servicio.id];
                                const config = cellData ? statusConfig[cellData.status] : statusConfig.inexistente;

                                return (
                                  <Tooltip key={servicio.id}>
                                    <TooltipTrigger asChild>
                                      <Link href={`/documentos?${createQueryString(elem.id, servicio.id)}`} className="block">
                                        <div className={cn(
                                          "p-2 rounded-md border-2 border-transparent flex flex-col items-center justify-center text-center h-full transition-all",
                                          config.className
                                        )}>
                                          <span className="text-xs font-medium text-foreground/80 mb-1 truncate w-full" title={servicio.nombre}>{servicio.nombre}</span>
                                          <span className="text-xl font-bold">
                                            {cellData && cellData.count > 0 ? cellData.count : "—"}
                                          </span>
                                        </div>
                                      </Link>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="font-semibold">{config.label}</p>
                                      <p>{cellData?.count || 0} documento(s)</p>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </TooltipProvider>
  );
}
