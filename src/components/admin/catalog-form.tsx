
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
import { Loader2, Save } from "lucide-react";
import { addCatalogItem, updateCatalogItem } from "@/lib/data";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

const catalogTypeOptions = [
    { value: "ambitos", label: "Ámbito" },
    { value: "caracteristicas", label: "Característica" },
    { value: "puntosVerificacion", label: "Punto de Verificación" },
    { value: "elementosMedibles", label: "Elemento Medible" },
    { value: "tiposDocumento", label: "Tipo de Documento" },
    { value: "servicios", label: "Servicio" },
    { value: "estadosAcreditacionDoc", label: "Estado de Documento" },
] as const;
type CatalogType = typeof catalogTypeOptions[number]['value'];

const formSchema = z.discriminatedUnion("catalogType", [
    z.object({ catalogType: z.literal("ambitos"), nombre: z.string().min(2, "Mínimo 2 caracteres"), orden: z.coerce.number().min(1, "Debe ser > 0") }),
    z.object({ catalogType: z.literal("caracteristicas"), nombre: z.string().min(2, "Mínimo 2 caracteres"), orden: z.coerce.number().min(1, "Debe ser > 0"), ambitoId: z.string({ required_error: "Requerido."}) }),
    z.object({ catalogType: z.literal("puntosVerificacion"), nombre: z.string().min(2, "Mínimo 2 caracteres"), orden: z.coerce.number().min(1, "Debe ser > 0"), codigo: z.string().min(1, "Requerido"), caracteristicaId: z.string({ required_error: "Requerido."}) }),
    z.object({ catalogType: z.literal("elementosMedibles"), nombre: z.string().min(2, "Mínimo 2 caracteres"), orden: z.coerce.number().min(1, "Debe ser > 0"), codigo: z.string().min(1, "Requerido"), puntoVerificacionId: z.string({ required_error: "Requerido."}) }),
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

      // Pre-fill parent selects for cascading dropdowns to work on edit
      if (item.type === "elementosMedibles") {
        const punto = catalogs.puntosVerificacion.find(
          (p) => p.id === item.data.puntoVerificacionId
        );
        if (punto) {
          defaultValues.caracteristicaId = punto.caracteristicaId;
          const caracteristica = catalogs.caracteristicas.find(
            (c) => c.id === punto.caracteristicaId
          );
          if (caracteristica) {
            defaultValues.ambitoId = caracteristica.ambitoId;
          }
        }
      } else if (item.type === "puntosVerificacion") {
        const caracteristica = catalogs.caracteristicas.find(
          (c) => c.id === item.data.caracteristicaId
        );
        if (caracteristica) {
          defaultValues.ambitoId = caracteristica.ambitoId;
        }
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
      puntoVerificacionId: undefined,
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
  const caracteristicaIdForFilter = form.watch("caracteristicaId" as any);

  const filteredCaracteristicas = useMemo(() => {
    if (!ambitoIdForFilter) return catalogs.caracteristicas;
    return catalogs.caracteristicas.filter((c) => c.ambitoId === ambitoIdForFilter);
  }, [ambitoIdForFilter, catalogs.caracteristicas]);

  const filteredPuntos = useMemo(() => {
    if (!caracteristicaIdForFilter) return catalogs.puntosVerificacion;
    return catalogs.puntosVerificacion.filter((p) => p.caracteristicaId === caracteristicaIdForFilter);
  }, [caracteristicaIdForFilter, catalogs.puntosVerificacion]);


  async function onSubmit(values: FormValues) {
    if (!authUser) {
      toast({ variant: "destructive", title: "Error de autenticación", description: "No se pudo verificar el usuario." });
      return;
    }
    setIsSubmitting(true);
    try {
      const { catalogType, ...data } = values;
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

        {(catalogType === 'puntosVerificacion' || catalogType === 'elementosMedibles') && <FormField control={form.control} name="codigo" render={({ field }) => (<FormItem><FormLabel>Código</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />}

        {(catalogType === 'ambitos' || catalogType === 'caracteristicas' || catalogType === 'puntosVerificacion' || catalogType === 'elementosMedibles') && <FormField control={form.control} name="orden" render={({ field }) => (<FormItem><FormLabel>Orden</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />}

        {catalogType === 'caracteristicas' && <FormField control={form.control} name="ambitoId" render={({ field }) => (<FormItem><FormLabel>Ámbito</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un ámbito" /></SelectTrigger></FormControl><SelectContent>{catalogs.ambitos.map(i => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />}
        
        {catalogType === 'puntosVerificacion' && (
            <>
                <FormField control={form.control} name={"ambitoId" as any} render={({ field }) => (<FormItem><FormLabel>Filtrar por Ámbito</FormLabel><Select onValueChange={v => { field.onChange(v); form.setValue("caracteristicaId" as any, undefined); }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un ámbito para filtrar" /></SelectTrigger></FormControl><SelectContent>{catalogs.ambitos.map(i => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                <FormField control={form.control} name="caracteristicaId" render={({ field }) => (<FormItem><FormLabel>Característica</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!ambitoIdForFilter}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione una característica" /></SelectTrigger></FormControl><SelectContent>{filteredCaracteristicas.map(i => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            </>
        )}

        {catalogType === 'elementosMedibles' && (
            <>
                <FormField control={form.control} name={"ambitoId" as any} render={({ field }) => (<FormItem><FormLabel>Filtrar por Ámbito</FormLabel><Select onValueChange={v => { field.onChange(v); form.setValue("caracteristicaId" as any, undefined); form.setValue("puntoVerificacionId" as any, undefined); }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un ámbito para filtrar" /></SelectTrigger></FormControl><SelectContent>{catalogs.ambitos.map(i => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                <FormField control={form.control} name={"caracteristicaId" as any} render={({ field }) => (<FormItem><FormLabel>Filtrar por Característica</FormLabel><Select onValueChange={v => { field.onChange(v); form.setValue("puntoVerificacionId" as any, undefined);}} disabled={!ambitoIdForFilter} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione una característica para filtrar" /></SelectTrigger></FormControl><SelectContent>{filteredCaracteristicas.map(i => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                <FormField control={form.control} name="puntoVerificacionId" render={({ field }) => (<FormItem><FormLabel>Punto de Verificación</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!caracteristicaIdForFilter}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un punto de verificación" /></SelectTrigger></FormControl><SelectContent>{filteredPuntos.map(i => <SelectItem key={i.id} value={i.id}>{i.codigo} - {i.nombre}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
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
