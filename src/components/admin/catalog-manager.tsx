"use client";

import type { Catalogs } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "../ui/button";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const CatalogTable = ({ data, headers }: { data: any[], headers: { key: string, label: string }[] }) => {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map(h => <TableHead key={h.key}>{h.label}</TableHead>)}
            <TableHead><span className="sr-only">Acciones</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              {headers.map(h => (
                <TableCell key={`${item.id}-${h.key}`} className="font-medium">
                  {item[h.key]}
                </TableCell>
              ))}
              <TableCell className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4"/></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem><Edit className="mr-2 h-4 w-4"/> Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/> Eliminar</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export function CatalogManager({ catalogs }: { catalogs: Catalogs }) {
  const catalogTabs = [
    { value: "ambitos", label: "Ámbitos", data: catalogs.ambitos, headers: [{key: 'nombre', label: 'Nombre'}, {key: 'orden', label: 'Orden'}] },
    { value: "caracteristicas", label: "Características", data: catalogs.caracteristicas, headers: [{key: 'nombre', label: 'Nombre'}, {key: 'ambitoId', label: 'ID Ámbito'}, {key: 'orden', label: 'Orden'}] },
    { value: "puntosVerificacion", label: "Puntos de Verificación", data: catalogs.puntosVerificacion, headers: [{key: 'codigo', label: 'Código'}, {key: 'nombre', label: 'Nombre'}, {key: 'caracteristicaId', label: 'ID Característica'}] },
    { value: "elementosMedibles", label: "Elementos Medibles", data: catalogs.elementosMedibles, headers: [{key: 'codigo', label: 'Código'}, {key: 'nombre', label: 'Nombre'}, {key: 'puntoVerificacionId', label: 'ID Punto'}] },
    { value: "tiposDocumento", label: "Tipos de Documento", data: catalogs.tiposDocumento, headers: [{key: 'nombre', label: 'Nombre'}] },
    { value: "servicios", label: "Servicios", data: catalogs.servicios, headers: [{key: 'nombre', label: 'Nombre'}] },
    { value: "estadosAcreditacionDoc", label: "Estados de Documento", data: catalogs.estadosAcreditacionDoc, headers: [{key: 'nombre', label: 'Nombre'}] },
  ];

  return (
    <Tabs defaultValue="ambitos" className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 h-auto">
        {catalogTabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
        ))}
      </TabsList>
      {catalogTabs.map(tab => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
              <CatalogTable data={tab.data} headers={tab.headers} />
          </TabsContent>
      ))}
    </Tabs>
  );
}
