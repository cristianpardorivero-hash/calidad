'use client';

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
import { CalendarIcon, ChevronsUpDown, GitFork, Loader2, Save, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Separator } from "../ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { addDocument, updateDocument, createNewVersionAndUpdateDocument } from "@/lib/data";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "../ui/progress";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { ScrollArea } from "../ui/scroll-area";
import { auth, storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";


type FormValues = z.infer<ReturnType<typeof getFormSchema>>;

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_EXTENSIONS = ["pdf", "docx", "xlsx"];

// We need a dynamic schema based on whether we are editing or creating
const getFormSchema = (isEditing: boolean, isNewVersion: boolean) => z.object({
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
  file: z.any().refine((file) => isEditing && !isNewVersion ? true : !!file, "El archivo es requerido.").optional(),
  tags: z.string().optional().default(""),
  linkedDocumentId: z.string().optional(),
});

type DocumentFormProps = {
  catalogs: Catalogs;
  documents: Documento[];
  document?: Documento;
  isNewVersion?: boolean;
};

export function DocumentForm({ catalogs, documents, document, isNewVersion = false }: DocumentFormProps) {
  const { user, firebaseUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const isEditing = !!document;
  const formSchema = getFormSchema(isEditing, isNewVersion);

  const autoIncrementVersion = (version: string) => {
    const parts = version.split('.');
    if (parts.length > 0 && !isNaN(parseInt(parts[0]))) {
      const major = parseInt(parts[0]) + 1;
      return `${major}.0`;
    }
    return version; // fallback
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing && document ? {
        ...document,
        version: isNewVersion ? autoIncrementVersion(document.version) : document.version,
        tags: document.tags?.join(", ") || "",
        file: null, // Don't prepopulate file input
    } : {
      version: "1.0",
      titulo: "",
      descripcion: "",
      responsableNombre: "",
      responsableEmail: "",
      tags: "",
      servicioIds: [],
      linkedDocumentId: "",
      file: null,
    },
  });

  const fechaDocumento = form.watch("fechaDocumento");
  React.useEffect(() => {
    // Automatically set validity dates when creating a new document or a new version
    if (fechaDocumento && (!isEditing || isNewVersion)) {
      form.setValue("fechaVigenciaDesde", fechaDocumento, { shouldValidate: true });
      const newVigenciaHasta = new Date(fechaDocumento.getTime());
      newVigenciaHasta.setFullYear(newVigenciaHasta.getFullYear() + 5);
      form.setValue("fechaVigenciaHasta", newVigenciaHasta, { shouldValidate: true });
    }
  }, [fechaDocumento, isEditing, isNewVersion, form]);

  const tipoDocumentoId = form.watch("tipoDocumentoId");
  const ambitoId = form.watch("ambitoId");
  const caracteristicaId = form.watch("caracteristicaId");
  const elementoMedibleId = form.watch("elementoMedibleId");

  const linkableDocTypeIds = React.useMemo(() => {
    const linkableNames = ['pauta de cotejo', 'pauta de evaluacion', 'indicador'];
    return catalogs.tiposDocumento
      .filter(td => linkableNames.includes(td.nombre.toLowerCase()))
      .map(td => td.id);
  }, [catalogs.tiposDocumento]);

  const isLinkableDocType = tipoDocumentoId ? linkableDocTypeIds.includes(tipoDocumentoId) : false;

  const filteredCaracteristicas = React.useMemo(() => {
    if (!ambitoId) return [];
    return catalogs.caracteristicas
      .filter((c) => c.ambitoId === ambitoId)
      .sort((a,b) => a.orden - b.orden);
  }, [ambitoId, catalogs.caracteristicas]);

  const filteredElementos = React.useMemo(() => {
    if (!caracteristicaId) return [];
    return catalogs.elementosMedibles
      .filter((e) => e.caracteristicaId === caracteristicaId)
      .sort((a,b) => a.orden - b.orden);
  }, [caracteristicaId, catalogs.elementosMedibles]);
  
  const hasClassification = ambitoId || caracteristicaId || elementoMedibleId;

  const linkableDocuments = React.useMemo(() => {
    if (!documents) return [];

    let filtered = documents.filter(doc => !linkableDocTypeIds.includes(doc.tipoDocumentoId));

    if (!hasClassification) {
        return [];
    }

    if (ambitoId) {
        filtered = filtered.filter(doc => doc.ambitoId === ambitoId);
    }
    if (caracteristicaId) {
        filtered = filtered.filter(doc => doc.caracteristicaId === caracteristicaId);
    }
    if (elementoMedibleId) {
        filtered = filtered.filter(doc => doc.elementoMedibleId === elementoMedibleId);
    }

    // When editing a document, don't allow it to be linked to itself
    if (isEditing && document) {
        filtered = filtered.filter(doc => doc.id !== document.id);
    }

    return filtered.sort((a, b) => a.titulo.localeCompare(b.titulo));
  }, [documents, ambitoId, caracteristicaId, elementoMedibleId, linkableDocTypeIds, hasClassification, isEditing, document]);
  
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

  async function onSubmit(values: FormValues) {
    if (!user || !firebaseUser) {
      toast({
        variant: "destructive",
        title: "No autenticado",
        description: "Debes iniciar sesión para guardar un documento.",
      });
      return;
    }
    setIsSubmitting(true);
    
    if (isNewVersion && document) {
        if (!values.file) {
            form.setError("file", { message: "El archivo es requerido para una nueva versión." });
            setIsSubmitting(false);
            return;
        }

        setUploadProgress(0);

        const fileToUpload = values.file;
        const storagePath = `documentos/${user.hospitalId}/${Date.now()}-${fileToUpload.name}`;
        const storageRef = ref(storage, storagePath);
        
        const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                console.error("DEBUG: Error específico de subida a Storage:", error.code, error.message, error);
                toast({
                    variant: "destructive",
                    title: "Error de Subida",
                    description: `No se pudo subir el archivo. (${error.code})`,
                });
                setIsSubmitting(false);
                setUploadProgress(0);
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
                    const { file, ...restValues } = values;
                    const fileExt = fileToUpload.name.split(".").pop() as "pdf" | "docx" | "xlsx";
                    
                    const newData = {
                        ...document,
                        ...restValues,
                        fileName: fileToUpload.name,
                        fileExt,
                        fileSize: fileToUpload.size,
                        mimeType: fileToUpload.type,
                        storagePath: storagePath, 
                        downloadUrl: downloadURL,
                        tags: values.tags?.split(",").map(t => t.trim()).filter(Boolean),
                        updatedAt: new Date(),
                    } as Documento;

                    try {
                        await createNewVersionAndUpdateDocument(document, newData, firebaseUser.uid);
                        toast({
                            title: "Nueva versión creada",
                            description: `Se ha creado la versión ${newData.version} de "${newData.titulo}".`,
                        });
                        router.push(`/documentos/${document.id}`);
                    } catch(e) {
                        console.error("Error creating new version:", e);
                        setIsSubmitting(false);
                        toast({
                            variant: "destructive",
                            title: "Error al crear versión",
                            description: "No se pudo guardar la nueva versión del documento.",
                        });
                    }
                }).catch((error) => {
                    console.error("DEBUG: Error al obtener URL de descarga DESPUÉS de subir el archivo:", error);
                    toast({
                        variant: "destructive",
                        title: "Error de Subida",
                        description: "No se pudo obtener la URL de descarga. Por favor, inténtalo de nuevo.",
                    });
                    setIsSubmitting(false);
                });
            }
        );
    } else if (isEditing && document) {
        const { file, ...updateValues } = values; // file changes are not handled in edit mode
        const dataToUpdate: Partial<Documento> = {
            ...updateValues,
            tags: updateValues.tags?.split(",").map(t => t.trim()).filter(Boolean),
        };
        try {
            await updateDocument(document.id, dataToUpdate);
            toast({
                title: "Documento actualizado",
                description: `El documento "${dataToUpdate.titulo}" ha sido guardado.`,
            });
            router.push(`/documentos/${document.id}`);
        } catch(e) {
            console.error(e);
            toast({
                variant: "destructive",
                title: "Error al actualizar",
                description: "No se pudo guardar el documento. Inténtalo de nuevo.",
            });
        } finally {
            setIsSubmitting(false);
        }
    } else {
        // CREATE LOGIC
        if (!values.file) {
            form.setError("file", { message: "El archivo es requerido." });
            setIsSubmitting(false);
            return;
        }

        setUploadProgress(0);

        const fileToUpload = values.file;
        const storagePath = `documentos/${user.hospitalId}/${Date.now()}-${fileToUpload.name}`;
        const storageRef = ref(storage, storagePath);
        
        const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                console.error("DEBUG: Error específico de subida a Storage:", error.code, error.message, error);
                toast({
                    variant: "destructive",
                    title: "Error de Subida",
                    description: `No se pudo subir el archivo. (${error.code})`,
                });
                setIsSubmitting(false);
                setUploadProgress(0);
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {

                    const { fechaVigenciaDesde, fechaVigenciaHasta, file, ...restValues } = values;
                    const fileExt = fileToUpload.name.split(".").pop() as "pdf" | "docx" | "xlsx";

                    const docData: Omit<Documento, 'id'|'createdAt'|'updatedAt'> = {
                        ...restValues,
                        hospitalId: user.hospitalId,
                        fileName: fileToUpload.name,
                        fileExt: fileExt,
                        fileSize: fileToUpload.size,
                        mimeType: fileToUpload.type,
                        storagePath: storagePath, 
                        downloadUrl: downloadURL,
                        tags: values.tags?.split(",").map(t => t.trim()).filter(Boolean),
                        createdByUid: firebaseUser.uid,
                        createdByEmail: firebaseUser.email || 'N/A',
                        isDeleted: false,
                        searchKeywords: [values.titulo, values.responsableNombre, ...(values.tags?.split(",").map(t => t.trim()).filter(Boolean) || [])],
                        ...(fechaVigenciaDesde && { fechaVigenciaDesde }),
                        ...(fechaVigenciaHasta && { fechaVigenciaHasta }),
                    };

                    try {
                        const savedDoc = await addDocument(docData);
                        
                        toast({
                            title: "Documento subido con éxito",
                            description: `El documento "${savedDoc.titulo}" ha sido guardado.`,
                        });

                        router.push(`/documentos/${savedDoc.id}`);

                    } catch(e) {
                        console.error("DEBUG: Error al guardar metadatos en Firestore DESPUÉS de subir el archivo:", e);
                        setIsSubmitting(false);
                        toast({
                            variant: "destructive",
                            title: "Error al guardar en Base de Datos",
                            description: "El archivo se subió, pero no se pudo guardar su información. Contacte a soporte.",
                        });
                    }
                }).catch((error) => {
                    console.error("DEBUG: Error al obtener URL de descarga DESPUÉS de subir el archivo:", error);
                    toast({
                        variant: "destructive",
                        title: "Error de Subida",
                        description: "No se pudo obtener la URL de descarga. Por favor, inténtalo de nuevo.",
                    });
                    setIsSubmitting(false);
                });
            }
        );
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
                      {[...catalogs.tiposDocumento].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((tipo) => (
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
                      {[...catalogs.estadosAcreditacionDoc].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((estado) => (
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
            <CardTitle>B) Clasificación de Acreditación</CardTitle>
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
                        <SelectContent>{[...catalogs.ambitos].sort((a, b) => a.orden - b.orden).map((a) => (<SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>))}</SelectContent>
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
                    <Select
                        onValueChange={(value) => {
                            field.onChange(value);
                            const selectedElemento = catalogs.elementosMedibles.find(e => e.id === value);
                            if (selectedElemento && selectedElemento.servicioIds) {
                                form.setValue("servicioIds", selectedElemento.servicioIds, { shouldValidate: true });
                            } else {
                                form.setValue("servicioIds", [], { shouldValidate: true });
                            }
                        }}
                        value={field.value || ''}
                        disabled={!caracteristicaId}>
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

        {isLinkableDocType && (
            <Card>
                <CardHeader>
                    <CardTitle>Vinculación de Documento</CardTitle>
                    <CardDescription>
                        Si este documento es una pauta, indicador o similar, selecciona el documento principal que verifica. Los documentos se filtran por la clasificación de acreditación seleccionada.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="linkedDocumentId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Documento a Vincular</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ''} disabled={!hasClassification || linkableDocuments.length === 0}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={!hasClassification ? "Completa la clasificación para filtrar" : "No hay documentos que coincidan"} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {linkableDocuments.map((doc) => (
                                            <SelectItem key={doc.id} value={doc.id}>
                                                {doc.titulo} (v{doc.version})
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
        )}

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


        {(!isEditing || isNewVersion) && (
            <Card>
                <CardHeader><CardTitle>E) Archivo</CardTitle></CardHeader>
                <CardContent>
                    <FormField
                    control={form.control}
                    name="file"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Seleccionar archivo {isNewVersion && "(requerido para la nueva versión)"}</FormLabel>
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
        )}
        
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
        
        {isSubmitting && (!isEditing || isNewVersion) && (
            <div className="space-y-2">
                <Label>Subiendo documento...</Label>
                <Progress value={uploadProgress} />
                <p className="text-sm text-muted-foreground">{Math.round(uploadProgress) === 100 ? "Finalizando..." : `Progreso: ${Math.round(uploadProgress)}%`}</p>
            </div>
        )}

        <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
             ) : isNewVersion ? (
                <GitFork className="mr-2 h-4 w-4" />
             ) : isEditing ? (
                <Save className="mr-2 h-4 w-4" />
             ) : (
                <UploadCloud className="mr-2 h-4 w-4" />
             )}
                {isNewVersion ? "Crear Versión" : isEditing ? "Guardar Cambios" : "Subir Documento"}
            </Button>
        </div>
      </form>
    </Form>
  );
}
