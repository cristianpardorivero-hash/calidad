

"use client";

import type { Catalogs, Documento } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ChevronsUpDown, Loader2, Sparkles, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { addDocument } from "@/lib/data";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "../ui/progress";
import { suggestDocumentMetadata } from "@/ai/flows/ai-metadata-suggester";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { ScrollArea } from "../ui/scroll-area";


const formSchema = z.object({
  titulo: z.string().min(5, "El título debe tener al menos 5 caracteres.").default(""),
  descripcion: z.string().optional().default(""),
  tipoDocumentoId: z.string({ required_error: "Debe seleccionar un tipo." }),
  version: z.string().min(1, "La versión es requerida.").default("1.0"),
  estadoDocId: z.string({ required_error: "Debe seleccionar un estado." }),
  ambitoId: z.string({ required_error: "Debe seleccionar un ámbito." }),
  caracteristicaId: z.string({ required_error: "Debe seleccionar una característica." }),
  elementoMedibleId: z.string({ required_error: "Debe seleccionar un elemento medible." }),
  servicioIds: z.array(z.string()).optional().default([]),
  responsableNombre: z.string().min(2, "El nombre del responsable es requerido.").default(""),
  responsableEmail: z.string().email("Correo electrónico inválido.").default(""),
  fechaDocumento: z.date({ required_error: "La fecha del documento es requerida." }),
  fechaVigenciaDesde: z.date().optional(),
  fechaVigenciaHasta: z.date().optional(),
  file: z.any().refine((file) => file, "El archivo es requerido."),
  tags: z.string().optional().default(""),
});

type FormValues = z.infer<typeof formSchema>;

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_EXTENSIONS = ["pdf", "docx", "xlsx"];

export function DocumentForm({ catalogs }: { catalogs: Catalogs }) {
  const { user, firebaseUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      version: "1.0",
      titulo: "",
      descripcion: "",
      responsableNombre: "",
      responsableEmail: "",
      tags: "",
      servicioIds: [],
    },
  });

  const ambitoId = form.watch("ambitoId");
  const caracteristicaId = form.watch("caracteristicaId");

  const filteredCaracteristicas = React.useMemo(() => {
    if (!ambitoId) return [];
    return catalogs.caracteristicas.filter((c) => c.ambitoId === ambitoId);
  }, [ambitoId, catalogs.caracteristicas]);

  const filteredElementos = React.useMemo(() => {
    if (!caracteristicaId) return [];
    return catalogs.elementosMedibles.filter((e) => e.caracteristicaId === caracteristicaId);
  }, [caracteristicaId, catalogs.elementosMedibles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
        form.setError("file", { message: "Tipo de archivo no permitido." });
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        form.setError("file", { message: `El archivo no debe exceder ${MAX_FILE_SIZE / 1024 / 1024}MB.` });
        return;
      }
      form.setValue("file", file);
      form.clearErrors("file");
      setFileToUpload(file);
    }
  };

  const handleAiSuggest = async () => {
    const title = form.getValues("titulo");
    if (!title) {
        form.setError("titulo", { message: "El título es necesario para la sugerencia IA." });
        return;
    }
    setIsAiLoading(true);
    try {
        const description = form.getValues("descripcion");
        // @ts-ignore
        const result = await suggestDocumentMetadata({ title, description, catalogs });
        
        form.setValue("tipoDocumentoId", result.suggestedTipoDocumentoId || '', { shouldValidate: true });
        form.setValue("tags", result.suggestedTags.join(", "), { shouldValidate: true });
        form.setValue("ambitoId", result.suggestedAmbitoId || '', { shouldValidate: true });
        form.setValue("caracteristicaId", result.suggestedCaracteristicaId || '', { shouldValidate: true });
        form.setValue("elementoMedibleId", result.suggestedElementoMedibleId || '', { shouldValidate: true });

        toast({
            title: "Sugerencias aplicadas",
            description: "La IA ha rellenado los campos de clasificación.",
        });

    } catch (error) {
        console.error("AI suggestion failed", error);
        toast({
            variant: "destructive",
            title: "Error de IA",
            description: "No se pudieron obtener las sugerencias.",
        });
    } finally {
        setIsAiLoading(false);
    }
  };

  async function onSubmit(values: FormValues) {
    if (!user || !firebaseUser) {
      toast({
        variant: "destructive",
        title: "No autenticado",
        description: "Debes iniciar sesión para subir un documento.",
      });
      return;
    }
    setIsSubmitting(true);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 5;
      });
    }, 200);

    const fileExt = values.file.name.split(".").pop() as "pdf" | "docx" | "xlsx";
    const storagePath = `documentos/${user.hospitalId}/${values.ambitoId}/${Date.now()}/${values.file.name}`;
    
    const { fechaVigenciaDesde, fechaVigenciaHasta, file, ...restValues } = values;

    const docData: Omit<Documento, 'id'|'createdAt'|'updatedAt'|'downloadUrl'> = {
        ...restValues,
        hospitalId: user.hospitalId,
        fileName: values.file.name,
        fileExt: fileExt,
        fileSize: values.file.size,
        mimeType: values.file.type,
        storagePath: storagePath, 
        tags: values.tags?.split(",").map(t => t.trim()).filter(Boolean),
        createdByUid: firebaseUser.uid,
        createdByEmail: firebaseUser.email || 'N/A',
        isDeleted: false,
        searchKeywords: [values.titulo, values.responsableNombre, ...(values.tags?.split(",").map(t => t.trim()).filter(Boolean) || [])],
        ...(fechaVigenciaDesde && { fechaVigenciaDesde }),
        ...(fechaVigenciaHasta && { fechaVigenciaHasta }),
    };

    try {
        // In real app, first upload to storage, get URL, then save document.
        // For now, we simulate success.
        // const downloadUrl = await uploadFileAndGetURL(values.file, storagePath);
        const finalDoc = {...docData, downloadUrl: '#' };

        const savedDoc = await addDocument(finalDoc);
        
        setUploadProgress(100);
        clearInterval(progressInterval);
        
        toast({
            title: "Documento subido con éxito",
            description: `El documento "${savedDoc.titulo}" ha sido guardado.`,
        });

        router.push(`/documentos/${savedDoc.id}`);

    } catch(e) {
        setIsSubmitting(false);
        setUploadProgress(0);
        clearInterval(progressInterval);
        console.error(e);
        toast({
            variant: "destructive",
            title: "Error al subir",
            description: "No se pudo guardar el documento. Inténtalo de nuevo.",
        });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Sections */}
        <Card>
          <CardHeader>
            <CardTitle>A) Identificación</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Título del documento</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Protocolo de Higiene de Manos" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Descripción (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe brevemente el propósito del documento..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tipoDocumentoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de documento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {catalogs.tiposDocumento.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id}>
                          {tipo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Versión</FormLabel>
                  <FormControl>
                    <Input placeholder="1.0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="estadoDocId"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Estado del documento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {catalogs.estadosAcreditacionDoc.map((estado) => (
                        <SelectItem key={estado.id} value={estado.id}>
                          {estado.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
                <CardTitle>B) Clasificación de Acreditación</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={handleAiSuggest} disabled={isAiLoading || isSubmitting}>
                    {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-primary" />}
                    Sugerir con IA
                </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
                <FormField
                control={form.control}
                name="ambitoId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Ámbito</FormLabel>
                    <Select onValueChange={(value) => { field.onChange(value); form.setValue("caracteristicaId", ''); form.setValue("elementoMedibleId", '');}} value={field.value || ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un ámbito" /></SelectTrigger></FormControl>
                        <SelectContent>{catalogs.ambitos.map((a) => (<SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>))}</SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="caracteristicaId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Característica</FormLabel>
                    <Select onValueChange={(value) => { field.onChange(value); form.setValue("elementoMedibleId", ''); }} value={field.value || ''} disabled={!ambitoId}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una característica" /></SelectTrigger></FormControl>
                        <SelectContent>{filteredCaracteristicas.map((c) => (<SelectItem key={c.id} value={c.id}>{c.codigo} - {c.nombre}</SelectItem>))}</SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <div className="space-y-4">
                <FormField
                control={form.control}
                name="elementoMedibleId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Elemento medible</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''} disabled={!caracteristicaId}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un elemento" /></SelectTrigger></FormControl>
                        <SelectContent>{filteredElementos.map((e) => (<SelectItem key={e.id} value={e.id}>{e.codigo} - {e.nombre}</SelectItem>))}</SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>C) Contexto institucional</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="servicioIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Servicios/Unidades (Opcional)</FormLabel>
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
                          {catalogs.servicios.map((servicio) => (
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
            <FormField control={form.control} name="responsableNombre" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Responsable</FormLabel>
                  <FormControl><Input placeholder="Ej: Dra. Ana Reyes" {...field} /></FormControl><FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="responsableEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email del Responsable</FormLabel>
                  <FormControl><Input placeholder="ej: a.reyes@hospital.cl" {...field} /></FormControl><FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>D) Fechas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
          <FormField control={form.control} name="fechaDocumento" render={({ field }) => (
              <FormItem className="flex flex-col"><FormLabel>Fecha del documento</FormLabel>
                <Popover><PopoverTrigger asChild>
                    <FormControl>
                      <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? (format(field.value, "PPP", { locale: es })) : (<span>Elige una fecha</span>)}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                  </PopoverContent>
                </Popover><FormMessage /></FormItem>
            )}/>
          <FormField control={form.control} name="fechaVigenciaDesde" render={({ field }) => (
              <FormItem className="flex flex-col"><FormLabel>Vigencia Desde (Opcional)</FormLabel>
                <Popover><PopoverTrigger asChild>
                    <FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? (format(field.value, "PPP", { locale: es })) : (<span>Elige una fecha</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl>
                  </PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                </Popover><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="fechaVigenciaHasta" render={({ field }) => (
              <FormItem className="flex flex-col"><FormLabel>Vigencia Hasta (Opcional)</FormLabel>
                <Popover><PopoverTrigger asChild>
                    <FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? (format(field.value, "PPP", { locale: es })) : (<span>Elige una fecha</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl>
                  </PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                </Popover><FormMessage /></FormItem>
            )}/>
          </CardContent>
        </Card>
        </div>


        <Card>
            <CardHeader><CardTitle>E) Archivo</CardTitle></CardHeader>
            <CardContent>
                <FormField
                control={form.control}
                name="file"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Seleccionar archivo</FormLabel>
                    <FormControl>
                        <div className="relative flex w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-card p-8 hover:bg-muted/50">
                            <UploadCloud className="mb-2 h-10 w-10 text-muted-foreground" />
                            <div className="text-center">
                                <p className="font-semibold">Click para subir o arrastra y suelta</p>
                                <p className="text-xs text-muted-foreground">PDF, DOCX, XLSX (max. 25MB)</p>
                            </div>
                            <Input
                                type="file"
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                onChange={handleFileChange}
                                accept=".pdf,.docx,.xlsx"
                            />
                        </div>
                    </FormControl>
                    {fileToUpload && (
                        <div className="mt-4 text-sm text-muted-foreground">
                            <strong>Archivo seleccionado:</strong> {fileToUpload.name} ({(fileToUpload.size / 1024 / 1024).toFixed(2)} MB)
                        </div>
                    )}
                    <FormMessage />
                    </FormItem>
                )}
                />
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader><CardTitle>F) Etiquetas</CardTitle></CardHeader>
            <CardContent>
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="IAAS, consentimiento, urgencia..." {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormDescription>
                    Separa las etiquetas con comas.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            </CardContent>
        </Card>

        <Separator />
        
        {isSubmitting && (
            <div className="space-y-2">
                <Label>Subiendo documento...</Label>
                <Progress value={uploadProgress} />
                <p className="text-sm text-muted-foreground">{uploadProgress === 100 ? "Finalizando..." : `Progreso: ${uploadProgress}%`}</p>
            </div>
        )}

        <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                Subir Documento
            </Button>
        </div>
      </form>
    </Form>
  );
}
