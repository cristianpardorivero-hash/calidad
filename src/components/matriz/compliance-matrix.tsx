'use client';

import { useMemo, Fragment } from 'react';
import Link from 'next/link';
import type { Documento, Catalogs } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

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
      }).filter(c => c.elementos.length > 0); // Only show characteristics that have measurable elements

      return { ...ambito, caracteristicas: caracteristicasConElementos };
    }).filter(a => a.caracteristicas.length > 0); // Only show ambitos that have characteristics

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
            <CardHeader>
                <CardTitle>Sin Datos</CardTitle>
                <CardDescription>No hay características o elementos medibles definidos en los catálogos para mostrar la matriz.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matriz de Cumplimiento Detallada</CardTitle>
        <CardDescription>
            Vista de Elementos Medibles por Servicio. Pase el cursor sobre una celda para ver el estado y haga clic para ver los documentos.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 overflow-x-auto">
        <TooltipProvider>
          <table className="w-full border-collapse min-w-[1200px]">
            <thead>
              <tr className="border-b-2">
                <th className="sticky left-0 top-0 p-3 text-left font-semibold bg-slate-100 dark:bg-slate-800 z-30 w-[400px]">Elemento Medible</th>
                {sortedServicios.map(servicio => (
                  <th key={servicio.id} className="sticky top-0 p-3 text-center font-semibold bg-slate-100 dark:bg-slate-800 z-20 w-28 text-muted-foreground">
                    {servicio.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedStructure.map((ambito) => (
                <Fragment key={ambito.id}>
                  <tr className="bg-primary/10">
                    <td colSpan={sortedServicios.length + 1} className="sticky left-0 p-2 font-bold text-primary bg-primary/10 z-20">
                      {ambito.nombre}
                    </td>
                  </tr>
                  {ambito.caracteristicas.map(car => (
                    <Fragment key={car.id}>
                      <tr className="bg-muted/50">
                        <td colSpan={sortedServicios.length + 1} className="sticky left-0 py-2 pl-6 pr-2 font-semibold text-foreground bg-muted/50 z-20">
                          <div className='flex items-start gap-2'>
                              <Badge variant="secondary" className="font-mono mt-1">{car.codigo}</Badge>
                              <span>{car.nombre}</span>
                          </div>
                        </td>
                      </tr>
                      {car.elementos.map(elem => {
                        const createQueryString = (elementoMedibleId: string, servicioId: string) => {
                            const params = new URLSearchParams();
                            params.set('elementoMedibleId', elementoMedibleId);
                            params.set('servicioId', servicioId);
                            return params.toString();
                        }
                        return (
                          <tr key={elem.id} className="border-b last:border-b-0 group hover:bg-muted/20">
                            <td className="sticky left-0 p-2 text-sm bg-card group-hover:bg-muted/20 z-10">
                                <div className='flex items-start gap-2 pl-12'>
                                    <Badge variant="outline" className="font-mono mt-1">{elem.codigo}</Badge>
                                    <span>{elem.nombre}</span>
                                </div>
                            </td>
                            {sortedServicios.map(servicio => {
                                const cellData = matrixData[elem.id]?.[servicio.id];
                                const config = cellData ? statusConfig[cellData.status] : statusConfig.inexistente;
                                const isApplicable = elem.servicioIds?.includes(servicio.id);
                                
                                return (
                                <td key={servicio.id} className="p-1 align-middle">
                                    {isApplicable ? (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Link href={`/documentos?${createQueryString(elem.id, servicio.id)}`} className="block">
                                                    <div className={cn(
                                                        "w-full h-12 rounded-md border-2 border-transparent flex items-center justify-center text-base font-bold transition-all",
                                                        config.className
                                                    )}>
                                                        {cellData && cellData.count > 0 ? cellData.count : ''}
                                                    </div>
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="font-semibold">{config.label}</p>
                                                <p>{cellData?.count || 0} documento(s)</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    ) : (
                                        <div className="w-full h-12 rounded-md bg-muted/20"></div>
                                    )}
                                </td>
                                );
                            })}
                          </tr>
                        )
                      })}
                    </Fragment>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
