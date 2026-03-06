
"use client";

import type { Catalogs } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { ChevronsUpDown, Loader2, Save } from "lucide-react";
import { addCatalogItem, updateCatalogItem } from "@/lib/data";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Checkbox } from "../ui/checkbox";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";

const catalogTypeOptions = [
    { value: "ambitos", label: "Ámbito" },
    { value: "caracteristicas", label: "Característica" },
    { value: "elementosMedibles", label: "Elemento Medible" },
    { value: "tiposDocumento", label: "Tipo de Documento" },
    { value: "servicios", label: "Servicio" },
    { value: "estadosAcreditacionDoc", label: "Estado de Documento" },
] as const;
type CatalogType = typeof catalogTypeOptions[number]['value'];

const formSchema = z.discriminatedUnion("catalogType", [
    z.object({ catalogType: z.literal("ambitos"), nombre: z.string().min(2, "Mínimo 2 caracteres"), orden: z.coerce.number().min(1, "Debe ser > 0") }),
    z.object({ catalogType: z.literal("caracteristicas"), nombre: z.string().min(2, "Mínimo 2 caracteres"), orden: z.coerce.number().min(1, "Debe ser > 0"), ambitoId: z.string({ required_error: "Requerido."}), codigo: z.string().min(1, "Requerido"), umbralCumplimiento: z.string().optional() }),
    z.object({ catalogType: z.literal("elementosMedibles"), nombre: z.string().min(2, "Mínimo 2 caracteres"), orden: z.coerce.number().min(1, "Debe ser > 0"), codigo: z.string().min(1, "Requerido"), caracteristicaId: z.string({ required_error: "Requerido."}), servicioIds: z.array(z.string()).optional() }),
    z.object({ catalogType: z.literal("tiposDocumento"), nombre: z.string().min(2, "Mínimo 2 caracteres") }),
    z.object({ catalogType: z.literal("servicios"), nombre: z.string().min(2, "Mínimo 2 caracteres") }),
    z.object({ catalogType: z.literal("estadosAcreditacionDoc"), nombre: z.string().min(2, "Mínimo 2 caracteres") }),
]);

type FormValues = z.infer<typeof formSchema>;

interface CatalogFormProps {
    catalogs: Catalogs;
    item?: { data: any; type: string };
    onSave?: () => void;
    onCancel?: () => void;
}


export function CatalogForm({ catalogs, item, onSave, onCancel }: CatalogFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user: authUser } = useAuth();
  const isEditing = !!item;

  const initialValues = useMemo(() => {
    if (isEditing && item) {
      let defaultValues: any = { catalogType: item.type, ...item.data };
      if (item.type === "elementosMedibles") {
         const elemento = catalogs.elementosMedibles.find(e => e.id === item.data.id);
         if (elemento) {
            const caracteristica = catalogs.caracteristicas.find(c => c.id === elemento.caracteristicaId);
            if (caracteristica) {
                defaultValues.ambitoId = caracteristica.ambitoId;
            }
         }
         defaultValues.servicioIds = item.data.servicioIds || [];
      }
      return defaultValues;
    }
    // For create form
    return {
      catalogType: undefined,
      nombre: "",
      codigo: "",
      orden: undefined,
      ambitoId: undefined,
      caracteristicaId: undefined,
      umbralCumplimiento: "",
      servicioIds: []
    };
  }, [item, isEditing, catalogs]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });

  // This effect will re-sync the form if the `item` prop changes while the component is mounted.
  useEffect(() => {
    form.reset(initialValues);
  }, [initialValues, form]);

  const catalogType = form.watch("catalogType");
  const ambitoIdForFilter = form.watch("ambitoId" as any);

  const filteredCaracteristicas = useMemo(() => {
    if (!ambitoIdForFilter) return catalogs.caracteristicas.sort((a,b) => a.orden - b.orden);
    return catalogs.caracteristicas
        .filter((c) => c.ambitoId === ambitoIdForFilter)
        .sort((a,b) => a.orden - b.orden);
  }, [ambitoIdForFilter, catalogs.caracteristicas]);

  async function onSubmit(values: FormValues) {
    if (!authUser) {
      toast({ variant: "destructive", title: "Error de autenticación", description: "No se pudo verificar el usuario." });
      return;
    }
    setIsSubmitting(true);
    try {
      const { catalogType, ...data } = values;
      // remove temporary filter values
      if ('ambitoId' in data && (catalogType !== 'caracteristicas' && catalogType !== 'elementosMedibles')) {
        delete (data as any).ambitoId;
      }
      
      if (isEditing && item) {
          await updateCatalogItem(authUser.hospitalId, catalogType as keyof Catalogs, item.data.id, data);
          toast({ title: "Ítem actualizado", description: "El ítem de catálogo ha sido guardado." });
      } else {
        await addCatalogItem(authUser.hospitalId, catalogType as CatalogType, data);
        toast({ title: "Ítem creado", description: "El nuevo ítem de catálogo ha sido guardado." });
      }

      if (onSave) {
        onSave();
      } else {
        router.push("/admin/catalogos");
        router.refresh();
      }
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el ítem." });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleCancel = onCancel || (() => router.back());

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
        <FormField
            control={form.control}
            name="catalogType"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Tipo de Catálogo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={isEditing}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un tipo de catálogo" /></SelectTrigger></FormControl>
                    <SelectContent>
                        {catalogTypeOptions.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
        />
        
        {catalogType && <FormField control={form.control} name="nombre" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />}

        {(catalogType === 'caracteristicas' || catalogType === 'elementosMedibles') && <FormField control={form.control} name="codigo" render={({ field }) => (<FormItem><FormLabel>Código</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />}
        
        {catalogType === 'caracteristicas' && <FormField control={form.control} name="umbralCumplimiento" render={({ field }) => (<FormItem><FormLabel>Umbral de Cumplimiento (Opcional)</FormLabel><FormControl><Input placeholder="Ej: >= 66%" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />}

        {(catalogType === 'ambitos' || catalogType === 'caracteristicas' || catalogType === 'elementosMedibles') && <FormField control={form.control} name="orden" render={({ field }) => (<FormItem><FormLabel>Orden</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />}

        {(catalogType === 'caracteristicas' || catalogType === 'elementosMedibles') && <FormField control={form.control} name="ambitoId" render={({ field }) => (<FormItem><FormLabel>Ámbito</FormLabel><Select onValueChange={v => { field.onChange(v); if(catalogType === 'elementosMedibles') { form.setValue("caracteristicaId" as any, undefined); }}} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un ámbito" /></SelectTrigger></FormControl><SelectContent>{[...catalogs.ambitos].sort((a,b) => a.orden - b.orden).map(i => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />}
        
        {catalogType === 'elementosMedibles' && (
            <>
                <FormField control={form.control} name="caracteristicaId" render={({ field }) => (<FormItem><FormLabel>Característica</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!ambitoIdForFilter}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione una característica" /></SelectTrigger></FormControl><SelectContent>{filteredCaracteristicas.map(i => <SelectItem key={i.id} value={i.id}>{i.codigo} - {i.nombre}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                
                <FormField
                  control={form.control}
                  name="servicioIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Servicios Asignados (Opcional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                            >
                              <span className="truncate">
                                {field.value && field.value.length > 0
                                  ? `${field.value.length} seleccionado(s)`
                                  : "Seleccione servicios"}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <ScrollArea className="h-48">
                            <div className="p-2 space-y-1">
                              {[...catalogs.servicios].sort((a,b) => a.nombre.localeCompare(b.nombre)).map((servicio) => (
                                <FormItem key={servicio.id} className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(servicio.id)}
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value || [];
                                        return checked
                                          ? field.onChange([...currentValues, servicio.id])
                                          : field.onChange(currentValues.filter((id) => id !== servicio.id));
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">{servicio.nombre}</FormLabel>
                                </FormItem>
                              ))}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </>
        )}

        <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !catalogType}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isEditing ? "Guardar Cambios" : "Crear Ítem"}
            </Button>
        </div>
      </form>
    </Form>
  );
}

    