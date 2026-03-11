'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { Documento, Catalogs, Caracteristica, TipoDocumento } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

type CellStatus = 'vigente' | 'proximo_vencer' | 'vencido' | 'inexistente';

interface MatrixData {
  [caracteristicaId: string]: {
    [tipoDocId: string]: {
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

  return { status: 'inexistente', count: docs.length };
};

const statusConfig: { [key in CellStatus]: { label: string; className: string } } = {
  vigente: { label: 'Vigente', className: 'bg-green-100 dark:bg-green-900/50 hover:bg-green-200 dark:hover:bg-green-800/60 border-green-500' },
  proximo_vencer: { label: 'Próximo a Vencer', className: 'bg-yellow-100 dark:bg-yellow-900/50 hover:bg-yellow-200 dark:hover:bg-yellow-800/60 border-yellow-500' },
  vencido: { label: 'Vencido', className: 'bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800/60 border-red-500' },
  inexistente: { label: 'Inexistente', className: 'bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/60 border-slate-400' },
};


export function ComplianceMatrix({ documents, catalogs }: { documents: Documento[]; catalogs: Catalogs }) {
  const sortedTiposDocumento = useMemo(() => {
    return [...catalogs.tiposDocumento].sort((a, b) => a.orden - b.orden);
  }, [catalogs.tiposDocumento]);

  const groupedCaracteristicas = useMemo(() => {
    const grouped = catalogs.caracteristicas.reduce((acc, car) => {
      const ambito = catalogs.ambitos.find(a => a.id === car.ambitoId);
      if (ambito) {
        if (!acc[ambito.id]) {
          acc[ambito.id] = { ...ambito, caracteristicas: [] };
        }
        acc[ambito.id].caracteristicas.push(car);
      }
      return acc;
    }, {} as Record<string, { id: string; nombre: string; orden: number; caracteristicas: Caracteristica[] }>);
    
    return Object.values(grouped).sort((a, b) => a.orden - b.orden).map(ambito => {
        ambito.caracteristicas.sort((a,b) => a.orden - b.orden);
        return ambito;
    });

  }, [catalogs.ambitos, catalogs.caracteristicas]);

  const matrixData = useMemo<MatrixData>(() => {
    const data: MatrixData = {};
    catalogs.caracteristicas.forEach(car => {
      data[car.id] = {};
      sortedTiposDocumento.forEach(tipoDoc => {
        const relevantDocs = documents.filter(
          doc => doc.caracteristicaId === car.id && doc.tipoDocumentoId === tipoDoc.id && !doc.isDeleted
        );
        data[car.id][tipoDoc.id] = getStatus(relevantDocs);
      });
    });
    return data;
  }, [documents, catalogs.caracteristicas, sortedTiposDocumento]);
  
  if (groupedCaracteristicas.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Sin Datos</CardTitle>
                <CardDescription>No hay características definidas en los catálogos para mostrar la matriz.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 overflow-x-auto">
        <TooltipProvider>
          <table className="w-full border-collapse min-w-[1200px]">
            <thead>
              <tr className="border-b">
                <th className="sticky left-0 p-2 text-left font-semibold bg-card z-10 w-[400px]">Característica</th>
                {sortedTiposDocumento.map(tipo => (
                  <th key={tipo.id} className="p-2 text-center font-semibold text-sm w-36">
                    {tipo.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedCaracteristicas.map((ambito) => (
                <>
                  <tr key={ambito.id} className="bg-muted/50">
                    <td colSpan={sortedTiposDocumento.length + 1} className="p-2 font-bold text-primary sticky left-0 bg-muted/50 z-10">
                      {ambito.nombre}
                    </td>
                  </tr>
                  {ambito.caracteristicas.map(car => {
                    const createQueryString = (caracteristicaId: string, tipoDocumentoId: string) => {
                        const params = new URLSearchParams();
                        params.set('caracteristicaId', caracteristicaId);
                        params.set('tipoDocumentoId', tipoDocumentoId);
                        return params.toString();
                    }
                    return (
                        <tr key={car.id} className="border-b last:border-b-0">
                        <td className="sticky left-0 p-2 text-sm bg-card z-10">
                            <div className='flex items-start gap-2'>
                                <Badge variant="secondary" className="font-mono mt-1">{car.codigo}</Badge>
                                <span>{car.nombre}</span>
                            </div>
                        </td>
                        {sortedTiposDocumento.map(tipo => {
                            const cellData = matrixData[car.id]?.[tipo.id];
                            const config = cellData ? statusConfig[cellData.status] : statusConfig.inexistente;
                            return (
                            <td key={tipo.id} className="p-1 align-middle">
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link href={`/documentos?${createQueryString(car.id, tipo.id)}`} className="block">
                                        <div className={cn(
                                            "w-full h-16 rounded-md border-2 border-transparent flex items-center justify-center text-sm font-medium transition-all",
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
                            </td>
                            );
                        })}
                        </tr>
                    )
                  })}
                </>
              ))}
            </tbody>
          </table>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
