
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
import { MoreHorizontal, Edit, Trash2, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import React, { useState } from "react";
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { 
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { CatalogForm } from "./catalog-form";
import { deleteCatalogItem } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";


type CatalogItem = { id: string, nombre: string, [key: string]: any };

const CatalogTable = ({ 
    data, 
    headers,
    catalogType,
    onEdit,
    onDelete,
    loadingStates
}: { 
    data: CatalogItem[], 
    headers: { key: string, label: string }[],
    catalogType: string,
    onEdit: (item: CatalogItem) => void,
    onDelete: (item: CatalogItem) => void,
    loadingStates: Record<string, boolean>
}) => {
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
                {loadingStates[item.id] ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4"/></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => onEdit(item)}><Edit className="mr-2 h-4 w-4"/> Editar</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={() => onDelete(item)}>
                                <Trash2 className="mr-2 h-4 w-4"/> Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export function CatalogManager({ catalogs }: { catalogs: Catalogs }) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [itemToEdit, setItemToEdit] = useState<{ data: CatalogItem; type: string } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ data: CatalogItem; type: string } | null>(null);
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  
  const catalogTabs = [
    { value: "ambitos", label: "Ámbitos", data: catalogs.ambitos, headers: [{key: 'nombre', label: 'Nombre'}, {key: 'orden', label: 'Orden'}] },
    { value: "caracteristicas", label: "Características", data: catalogs.caracteristicas, headers: [{key: 'codigo', label: 'Código'}, {key: 'nombre', label: 'Nombre'}, {key: 'ambitoId', label: 'ID Ámbito'}, {key: 'orden', label: 'Orden'}] },
    { value: "elementosMedibles", label: "Elementos Medibles", data: catalogs.elementosMedibles, headers: [{key: 'codigo', label: 'Código'}, {key: 'nombre', label: 'Nombre'}, {key: 'caracteristicaId', label: 'ID Característica'}] },
    { value: "tiposDocumento", label: "Tipos de Documento", data: catalogs.tiposDocumento, headers: [{key: 'nombre', label: 'Nombre'}] },
    { value: "servicios", label: "Servicios", data: catalogs.servicios, headers: [{key: 'nombre', label: 'Nombre'}] },
    { value: "estadosAcreditacionDoc", label: "Estados de Documento", data: catalogs.estadosAcreditacionDoc, headers: [{key: 'nombre', label: 'Nombre'}] },
  ];

  const handleEdit = (item: CatalogItem, type: string) => {
    setItemToEdit({ data: item, type });
  }

  const handleDeleteRequest = (item: CatalogItem, type: string) => {
    setItemToDelete({ data: item, type });
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete || !authUser) return;
    setLoadingStates(prev => ({...prev, [itemToDelete.data.id]: true}));
    try {
        await deleteCatalogItem(authUser.hospitalId, itemToDelete.type as keyof Catalogs, itemToDelete.data.id);
        toast({
            title: "Ítem Eliminado",
            description: `El ítem "${itemToDelete.data.nombre}" ha sido eliminado.`,
        });
        // onSnapshot will handle the update
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: "Error", description: "No se pudo eliminar el ítem."});
    } finally {
        setLoadingStates(prev => ({...prev, [itemToDelete.data.id]: false}));
        setItemToDelete(null);
    }
  }


  return (
    <>
        <Tabs defaultValue="ambitos" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto">
                {catalogTabs.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
                ))}
            </TabsList>
            {catalogTabs.map(tab => (
                <TabsContent key={tab.value} value={tab.value} className="mt-4">
                    <CatalogTable 
                        data={tab.data} 
                        headers={tab.headers} 
                        catalogType={tab.value}
                        onEdit={(item) => handleEdit(item, tab.value)}
                        onDelete={(item) => handleDeleteRequest(item, tab.value)}
                        loadingStates={loadingStates}
                    />
                </TabsContent>
            ))}
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={!!itemToEdit} onOpenChange={(open) => !open && setItemToEdit(null)}>
            <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Editar Ítem de Catálogo</DialogTitle>
                <DialogDescription>
                Modifica los detalles del ítem y guarda los cambios.
                </DialogDescription>
            </DialogHeader>
            {itemToEdit && (
                <CatalogForm
                    catalogs={catalogs} 
                    item={itemToEdit}
                    onSave={() => {
                        setItemToEdit(null);
                        // onSnapshot will handle update
                    }}
                    onCancel={() => setItemToEdit(null)}
                />
            )}
            </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation */}
        <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro de que deseas eliminar este ítem?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. El ítem <strong>"{itemToDelete?.data.nombre}"</strong> será eliminado permanentemente.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
