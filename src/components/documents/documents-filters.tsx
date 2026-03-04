"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Catalogs } from "@/lib/types";
import { DateRangePicker } from "@/components/ui/date-range-picker";

export function DocumentsFilters({ catalogs }: { catalogs: Catalogs }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Component state to manage filter inputs
  const [filters, setFilters] = useState({
    query: searchParams.get("query") || "",
    ambitoId: searchParams.get("ambitoId") || "",
    caracteristicaId: searchParams.get("caracteristicaId") || "",
    puntoVerificacionId: searchParams.get("puntoVerificacionId") || "",
    elementoMedibleId: searchParams.get("elementoMedibleId") || "",
    tipoDocumentoId: searchParams.get("tipoDocumentoId") || "",
    estadoDocId: searchParams.get("estadoDocId") || "",
    servicioId: searchParams.get("servicioId") || "",
  });

  const createQueryString = useCallback(
    (newFilters: Partial<typeof filters>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      return params.toString();
    },
    [searchParams]
  );
  
  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    // Reset dependent filters if a parent is changed
    if (key === 'ambitoId') {
        newFilters.caracteristicaId = '';
        newFilters.puntoVerificacionId = '';
        newFilters.elementoMedibleId = '';
    } else if (key === 'caracteristicaId') {
        newFilters.puntoVerificacionId = '';
        newFilters.elementoMedibleId = '';
    } else if (key === 'puntoVerificacionId') {
        newFilters.elementoMedibleId = '';
    }
    setFilters(newFilters);
    router.push(pathname + "?" + createQueryString(newFilters));
  };
  
  const handleResetFilters = () => {
    const clearedFilters = {
        query: '', ambitoId: '', caracteristicaId: '', puntoVerificacionId: '',
        elementoMedibleId: '', tipoDocumentoId: '', estadoDocId: '', servicioId: ''
    };
    setFilters(clearedFilters);
    router.push(pathname);
  };
  
  const hasActiveFilters = Object.values(filters).some(v => v !== '') || searchParams.get('from') || searchParams.get('to');

  return (
    <Collapsible className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 w-full">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, tag, responsable..."
            className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            value={filters.query}
            onChange={(e) => handleFilterChange('query', e.target.value)}
          />
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            Filtros avanzados
            <ChevronsUpDown className="ml-2 h-4 w-4" />
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="mt-4 space-y-4 pt-4 border-t">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={filters.ambitoId} onValueChange={(v) => handleFilterChange('ambitoId', v)}>
            <SelectTrigger><SelectValue placeholder="Ámbito" /></SelectTrigger>
            <SelectContent>{catalogs.ambitos.map(i => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.caracteristicaId} onValueChange={(v) => handleFilterChange('caracteristicaId', v)} disabled={!filters.ambitoId}>
            <SelectTrigger><SelectValue placeholder="Característica" /></SelectTrigger>
            <SelectContent>{catalogs.caracteristicas.filter(c => c.ambitoId === filters.ambitoId).map(i => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.puntoVerificacionId} onValueChange={(v) => handleFilterChange('puntoVerificacionId', v)} disabled={!filters.caracteristicaId}>
            <SelectTrigger><SelectValue placeholder="Punto de Verificación" /></SelectTrigger>
            <SelectContent>{catalogs.puntosVerificacion.filter(p => p.caracteristicaId === filters.caracteristicaId).map(i => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.elementoMedibleId} onValueChange={(v) => handleFilterChange('elementoMedibleId', v)} disabled={!filters.puntoVerificacionId}>
            <SelectTrigger><SelectValue placeholder="Elemento Medible" /></SelectTrigger>
            <SelectContent>{catalogs.elementosMedibles.filter(e => e.puntoVerificacionId === filters.puntoVerificacionId).map(i => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.tipoDocumentoId} onValueChange={(v) => handleFilterChange('tipoDocumentoId', v)}>
            <SelectTrigger><SelectValue placeholder="Tipo de Documento" /></SelectTrigger>
            <SelectContent>{catalogs.tiposDocumento.map(i => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.estadoDocId} onValueChange={(v) => handleFilterChange('estadoDocId', v)}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>{catalogs.estadosAcreditacionDoc.map(i => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.servicioId} onValueChange={(v) => handleFilterChange('servicioId', v)}>
            <SelectTrigger><SelectValue placeholder="Servicio" /></SelectTrigger>
            <SelectContent>{catalogs.servicios.map(i => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <DateRangePicker />
        </div>
        {hasActiveFilters && (
            <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                    <X className="mr-2 h-4 w-4"/>
                    Limpiar filtros
                </Button>
            </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
