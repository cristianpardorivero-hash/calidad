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
  ChevronsUpDown,
  GitFork,
  Loader2,
  Save,
  UploadCloud,
  Check,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Separator } from "../ui/separator";
import { useUser } from "@/hooks/use-user";
import {
  addDocument,
  updateDocument,
  createNewVersionAndUpdateDocument,
} from "@/lib/data";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "../ui/progress";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { ScrollArea } from "../ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { storage } from "@/firebase/client";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["pdf", "docx", "xlsx"] as const;

function toDateInputValue(date?: Date | string | null): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInputValue(value?: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const d = new Date(year, month - 1, day);
  return isNaN(d.getTime()) ? undefined : d;
}

function addYearsToInputDate(value: string, years: number): string {
  const d = fromDateInputValue(value);
  if (!d) return "";
  d.setFullYear(d.getFullYear() + years);
  return toDateInputValue(d);
}

function getSafeFileName(fileName: string): string {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

const getFormSchema = (isEditing: boolean, isNewVersion: boolean) =>
  z.object({
    titulo: z
      .string()
      .min(5, "El título debe tener al menos 5 caracteres.")
      .default(""),
    descripcion: z.string().optional().default(""),
    tipoDocumentoId: z.string({ required_error: "Debe seleccionar un tipo." }),
    version: z.string().min(1, "La versión es requerida.").default("1.0"),
    estadoDocId: z.string({
      required_error: "Debe seleccionar un estado.",
    }),
    ambitoId: z.string({ required_error: "Debe seleccionar un ámbito." }),
    caracteristicaId: z.string({
      required_error: "Debe seleccionar una característica.",
    }),
    elementoMedibleId: z.string({
      required_error: "Debe seleccionar un elemento medible.",
    }),
    servicioIds: z.array(z.string()).optional().default([]),
    responsableNombre: z
      .string()
      .min(2, "El nombre del responsable es requerido.")
      .default(""),
    responsableEmail: z
      .string()
      .email("Correo electrónico inválido.")
      .default(""),
    fechaDocumento: z
      .string()
      .min(1, "La fecha del documento es requerida."),
    fechaVigenciaDesde: z.string().optional().default(""),
    fechaVigenciaHasta: z.string().optional().default(""),
    file: z
      .any()
      .refine(
        (file) => (isEditing && !isNewVersion ? true : !!file),
        "El archivo es requerido."
      )
      .optional(),
    tags: z.string().optional().default(""),
    linkedDocumentId: z.string().optional(),
  });

type FormValues = z.infer<ReturnType<typeof getFormSchema>>;

type DocumentFormProps = {
  catalogs: Catalogs;
  documents: Documento[];
  document?: Documento;
  isNewVersion?: boolean;
};

const wizardSteps = [
  { id: 1, name: "Carga e Identificación" },
  { id: 2, name: "Clasificación" },
  { id: 3, name: "Contexto y Fechas" },
  { id: 4, name: "Extras y Finalizar" },
];

const Stepper = ({ currentStep }: { currentStep: number }) => (
  <div className="flex items-center mb-8">
    {wizardSteps.map((step, index) => (
      <React.Fragment key={step.id}>
        <div className="flex flex-col items-center text-center w-24">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300",
              currentStep > step.id
                ? "bg-primary text-primary-foreground"
                : currentStep === step.id
                ? "bg-primary text-primary-foreground border-4 border-background ring-2 ring-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {currentStep > step.id ? <Check className="w-6 h-6" /> : step.id}
          </div>
          <p
            className={cn(
              "text-xs mt-2",
              currentStep >= step.id
                ? "font-semibold text-foreground"
                : "text-muted-foreground"
            )}
          >
            {step.name}
          </p>
        </div>
        {index < wizardSteps.length - 1 && (
          <div
            className={cn(
              "flex-auto border-t-2 transition-colors duration-500",
              currentStep > step.id + 1 || currentStep === step.id + 1
                ? "border-primary"
                : "border-border"
            )}
          />
        )}
      </React.Fragment>
    ))}
  </div>
);

function DateInputField({
  control,
  name,
  label,
  description,
  required = false,
  max,
  min = "1900-01-01",
}: {
  control: any;
  name: "fechaDocumento" | "fechaVigenciaDesde" | "fechaVigenciaHasta";
  label: string;
  description?: string;
  required?: boolean;
  max?: string;
  min?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required ? "" : " (Opcional)"}
          </FormLabel>
          <FormControl>
            <Input
              type="date"
              value={field.value || ""}
              onChange={field.onChange}
              min={min}
              max={max}
            />
          </FormControl>
          {description ? (
            <FormDescription>{description}</FormDescription>
          ) : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function DocumentForm({
  catalogs,
  documents,
  document,
  isNewVersion = false,
}: DocumentFormProps) {
  const { user, firebaseUser } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [step, setStep] = useState(1);

  const isEditing = !!document;
  const isCreation = !isEditing && !isNewVersion;

  const formSchema = getFormSchema(isEditing, isNewVersion);

  const autoIncrementVersion = (version: string) => {
    const parts = version.split(".");
    if (parts.length > 0 && !isNaN(parseInt(parts[0], 10))) {
      const major = parseInt(parts[0], 10) + 1;
      return `${major}.0`;
    }
    return version;
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues:
      isEditing && document
        ? {
            ...document,
            version: isNewVersion
              ? autoIncrementVersion(document.version)
              : document.version,
            tags: document.tags?.join(", ") || "",
            servicioIds: document.servicioIds || [],
            file: null,
            fechaDocumento: toDateInputValue(document.fechaDocumento),
            fechaVigenciaDesde: toDateInputValue(document.fechaVigenciaDesde),
            fechaVigenciaHasta: toDateInputValue(document.fechaVigenciaHasta),
          }
        : {
            version: "1.0",
            titulo: "",
            descripcion: "",
            responsableNombre: "",
            responsableEmail: "",
            tags: "",
            servicioIds: [],
            linkedDocumentId: "",
            file: null,
            fechaDocumento: "",
            fechaVigenciaDesde: "",
            fechaVigenciaHasta: "",
          },
  });

  const fechaDocumento = form.watch("fechaDocumento");

  useEffect(() => {
    if (fechaDocumento && (!isEditing || isNewVersion)) {
      form.setValue("fechaVigenciaDesde", fechaDocumento, {
        shouldValidate: true,
      });
      form.setValue("fechaVigenciaHasta", addYearsToInputDate(fechaDocumento, 5), {
        shouldValidate: true,
      });
    }
  }, [fechaDocumento, isEditing, isNewVersion, form]);

  const tipoDocumentoId = form.watch("tipoDocumentoId");
  const ambitoId = form.watch("ambitoId");
  const caracteristicaId = form.watch("caracteristicaId");
  const elementoMedibleId = form.watch("elementoMedibleId");

  const linkableDocTypeIds = React.useMemo(() => {
    const linkableNames = [
      "pauta de cotejo",
      "pauta de evaluacion",
      "indicador",
      "informe",
    ];
    return catalogs.tiposDocumento
      .filter((td) => linkableNames.includes(td.nombre.toLowerCase()))
      .map((td) => td.id);
  }, [catalogs.tiposDocumento]);

  const isLinkableDocType = tipoDocumentoId
    ? linkableDocTypeIds.includes(tipoDocumentoId)
    : false;

  const filteredCaracteristicas = React.useMemo(() => {
    if (!ambitoId) return [];
    return catalogs.caracteristicas
      .filter((c) => c.ambitoId === ambitoId)
      .sort((a, b) => a.orden - b.orden);
  }, [ambitoId, catalogs.caracteristicas]);

  const filteredElementos = React.useMemo(() => {
    if (!caracteristicaId) return [];
    return catalogs.elementosMedibles
      .filter((e) => e.caracteristicaId === caracteristicaId)
      .sort((a, b) => a.orden - b.orden);
  }, [caracteristicaId, catalogs.elementosMedibles]);

  const hasClassification = ambitoId || caracteristicaId || elementoMedibleId;

  const linkableDocuments = React.useMemo(() => {
    if (!documents) return [];

    let filtered = documents.filter(
      (doc) => !linkableDocTypeIds.includes(doc.tipoDocumentoId)
    );

    if (!hasClassification) return [];

    if (ambitoId) {
      filtered = filtered.filter((doc) => doc.ambitoId === ambitoId);
    }
    if (caracteristicaId) {
      filtered = filtered.filter(
        (doc) => doc.caracteristicaId === caracteristicaId
      );
    }
    if (elementoMedibleId) {
      filtered = filtered.filter(
        (doc) => doc.elementoMedibleId === elementoMedibleId
      );
    }

    if (isEditing && document) {
      filtered = filtered.filter((doc) => doc.id !== document.id);
    }

    return filtered.sort((a, b) => a.titulo.localeCompare(b.titulo));
  }, [
    documents,
    ambitoId,
    caracteristicaId,
    elementoMedibleId,
    linkableDocTypeIds,
    hasClassification,
    isEditing,
    document,
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt as any)) {
      form.setError("file", { message: "Tipo de archivo no permitido." });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      form.setError("file", {
        message: `El archivo no debe exceder ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
      });
      return;
    }

    form.setValue("file", file);
    form.clearErrors("file");
    setFileToUpload(file);
  };

  const uploadFile = async (file: File, hospitalId: string) => {
    const safeFileName = getSafeFileName(file.name);
    const storagePath = `documentos/${hospitalId}/${Date.now()}-${safeFileName}`;
    const storageRef = ref(storage, storagePath);

    const metadata: { contentType: string; contentDisposition?: string } = {
      contentType: file.type || "application/octet-stream",
    };

    if (file.type === "application/pdf") {
      metadata.contentDisposition = "inline";
    }

    return new Promise<{
      downloadURL: string;
      storagePath: string;
      mimeType: string;
    }>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => reject(error),
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              downloadURL,
              storagePath,
              mimeType: file.type || "application/octet-stream",
            });
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  };

  const handleNext = async () => {
    let fieldsToValidate: (keyof FormValues)[] = [];

    if (step === 1) fieldsToValidate = ["file", "titulo"];
    if (step === 2) {
      fieldsToValidate = [
        "ambitoId",
        "caracteristicaId",
        "elementoMedibleId",
        "tipoDocumentoId",
        "estadoDocId",
        "version",
      ];
    }
    if (step === 3) {
      fieldsToValidate = [
        "responsableNombre",
        "responsableEmail",
        "fechaDocumento",
      ];
    }

    const isValid = await form.trigger(fieldsToValidate);

    if (isValid) {
      setStep((prev) => prev + 1);
      window.scrollTo(0, 0);
    } else {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description:
          "Por favor, completa todos los campos requeridos antes de continuar.",
      });
    }
  };

  const handlePrev = () => {
    setStep((prev) => prev - 1);
    window.scrollTo(0, 0);
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

    const fechaDocumentoDate = fromDateInputValue(values.fechaDocumento);

    if (!fechaDocumentoDate) {
      toast({
        variant: "destructive",
        title: "Fecha inválida",
        description: "Debes ingresar una fecha de documento válida.",
      });
      setIsSubmitting(false);
      return;
    }

    const fechaVigenciaDesdeDate = fromDateInputValue(values.fechaVigenciaDesde);
    const fechaVigenciaHastaDate = fromDateInputValue(values.fechaVigenciaHasta);

    try {
      if (isNewVersion && document) {
        if (!(values.file instanceof File)) {
          form.setError("file", { message: "Debes seleccionar un archivo válido para la nueva versión." });
          setIsSubmitting(false);
          return;
        }

        setUploadProgress(0);

        const file = values.file;
        const { downloadURL, storagePath, mimeType } = await uploadFile(
          file,
          user.hospitalId
        );

        const fileExt = file.name.split(".").pop() as "pdf" | "docx" | "xlsx";

        const newData = {
          ...document,
          ...values,
          fechaDocumento: fechaDocumentoDate,
          fechaVigenciaDesde: fechaVigenciaDesdeDate,
          fechaVigenciaHasta: fechaVigenciaHastaDate,
          fileName: file.name,
          fileExt,
          fileSize: file.size,
          mimeType,
          storagePath,
          downloadUrl: downloadURL,
          tags: values.tags?.split(",").map((t) => t.trim()).filter(Boolean),
          updatedAt: new Date(),
        } as Documento;

        await createNewVersionAndUpdateDocument(
          document,
          newData,
          firebaseUser.uid
        );

        toast({
          title: "Nueva versión creada",
          description: `Se ha creado la versión ${newData.version} de "${newData.titulo}".`,
        });

        router.push(`/documentos/${document.id}`);
        return;
      }

      if (isEditing && document) {
        const { file, ...updateValues } = values;

        const dataToUpdate: Partial<Documento> = {
          ...updateValues,
          fechaDocumento: fechaDocumentoDate,
          fechaVigenciaDesde: fechaVigenciaDesdeDate,
          fechaVigenciaHasta: fechaVigenciaHastaDate,
          tags: updateValues.tags?.split(",").map((t) => t.trim()).filter(Boolean),
        };

        await updateDocument(document.id, dataToUpdate);

        toast({
          title: "Documento actualizado",
          description: `El documento "${dataToUpdate.titulo}" ha sido guardado.`,
        });

        router.push(`/documentos/${document.id}`);
        return;
      }

      if (!(values.file instanceof File)) {
        form.setError("file", { message: "Debes seleccionar un archivo para subir." });
        setIsSubmitting(false);
        return;
      }

      setUploadProgress(0);

      const file = values.file;
      const { downloadURL, storagePath, mimeType } = await uploadFile(
        file,
        user.hospitalId
      );

      const fileExt = file.name.split(".").pop() as "pdf" | "docx" | "xlsx";
      const tagsArray =
        values.tags?.split(",").map((t) => t.trim()).filter(Boolean) || [];

      const searchKeywords: string[] = [];
      const addKeywords = (text: string | undefined | null) => {
        if (typeof text === "string" && text.trim()) {
          const lowerText = text.trim().toLowerCase();
          searchKeywords.push(lowerText);
          lowerText.split(/\s+/).forEach((word) => {
            if (word.length > 2) searchKeywords.push(word);
          });
        }
      };

      addKeywords(values.titulo);
      addKeywords(values.descripcion);
      addKeywords(values.responsableNombre);
      tagsArray.forEach(addKeywords);

      const uniqueKeywords = [...new Set(searchKeywords)];

      const { file: ignoredFile, ...restValues } = values;

      const docData: Omit<Documento, "id" | "createdAt" | "updatedAt"> = {
        ...restValues,
        fechaDocumento: fechaDocumentoDate,
        fechaVigenciaDesde: fechaVigenciaDesdeDate,
        fechaVigenciaHasta: fechaVigenciaHastaDate,
        hospitalId: user.hospitalId,
        fileName: file.name,
        fileExt,
        fileSize: file.size,
        mimeType,
        storagePath,
        downloadUrl: downloadURL,
        tags: tagsArray,
        createdByUid: firebaseUser.uid,
        createdByEmail: firebaseUser.email || "N/A",
        isDeleted: false,
        searchKeywords: uniqueKeywords,
      };

      const savedDoc = await addDocument(docData);

      toast({
        title: "Documento subido con éxito",
        description: `El documento "${savedDoc.titulo}" ha sido guardado.`,
      });

      router.push(`/documentos/${savedDoc.id}`);
    } catch (e: any) {
      console.error("Error general en guardado/subida:", e);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          e?.message || e?.code || "No se pudo completar la operación.",
      });
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isCreation) {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                      <Input
                        placeholder="Ej: Protocolo de Higiene de Manos"
                        {...field}
                      />
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
                      <Textarea
                        placeholder="Describe brevemente el propósito del documento..."
                        {...field}
                      />
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[...catalogs.tiposDocumento]
                          .sort((a, b) => a.nombre.localeCompare(b.nombre))
                          .map((tipo) => (
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[...catalogs.estadosAcreditacionDoc]
                          .sort((a, b) => a.nombre.localeCompare(b.nombre))
                          .map((estado) => (
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
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("caracteristicaId", "");
                          form.setValue("elementoMedibleId", "");
                        }}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un ámbito" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[...catalogs.ambitos]
                            .sort((a, b) => a.orden - b.orden)
                            .map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.nombre}
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
                  name="caracteristicaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Característica</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("elementoMedibleId", "");
                        }}
                        value={field.value || ""}
                        disabled={!ambitoId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una característica" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredCaracteristicas.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.codigo} - {c.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
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
                          const selectedElemento = catalogs.elementosMedibles.find(
                            (e) => e.id === value
                          );
                          if (selectedElemento?.servicioIds) {
                            form.setValue("servicioIds", selectedElemento.servicioIds, {
                              shouldValidate: true,
                            });
                          } else {
                            form.setValue("servicioIds", [], {
                              shouldValidate: true,
                            });
                          }
                        }}
                        value={field.value || ""}
                        disabled={!caracteristicaId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un elemento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredElementos.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.codigo} - {e.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
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
                  Si este documento es una pauta, indicador o similar, selecciona el
                  documento principal que verifica.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="linkedDocumentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Documento a Vincular</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        disabled={!hasClassification || linkableDocuments.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !hasClassification
                                  ? "Completa la clasificación para filtrar"
                                  : "No hay documentos que coincidan"
                              }
                            />
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
              <CardHeader>
                <CardTitle>C) Contexto institucional</CardTitle>
              </CardHeader>
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
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
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
                              {[...catalogs.servicios]
                                .sort((a, b) => a.nombre.localeCompare(b.nombre))
                                .map((servicio) => (
                                  <FormItem
                                    key={servicio.id}
                                    className="flex flex-row items-center space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(servicio.id)}
                                        onCheckedChange={(checked) => {
                                          const currentValues = field.value || [];
                                          return checked
                                            ? field.onChange([
                                                ...currentValues,
                                                servicio.id,
                                              ])
                                            : field.onChange(
                                                currentValues.filter(
                                                  (id) => id !== servicio.id
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {servicio.nombre}
                                    </FormLabel>
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

                <FormField
                  control={form.control}
                  name="responsableNombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Responsable</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Dra. Ana Reyes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="responsableEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email del Responsable</FormLabel>
                      <FormControl>
                        <Input placeholder="ej: a.reyes@hospital.cl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>D) Fechas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DateInputField
                  control={form.control}
                  name="fechaDocumento"
                  label="Fecha del documento"
                  description="Puedes escribir la fecha manualmente o usar el calendario del navegador."
                  required
                  max={toDateInputValue(new Date())}
                />

                <DateInputField
                  control={form.control}
                  name="fechaVigenciaDesde"
                  label="Vigencia Desde"
                  description="Puedes modificarla manualmente si lo necesitas."
                />

                <DateInputField
                  control={form.control}
                  name="fechaVigenciaHasta"
                  label="Vigencia Hasta"
                  description="Puedes modificarla manualmente si lo necesitas."
                />
              </CardContent>
            </Card>
          </div>

          {(!isEditing || isNewVersion) && (
            <Card>
              <CardHeader>
                <CardTitle>E) Archivo</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="file"
                  render={() => (
                    <FormItem>
                      <FormLabel>
                        Seleccionar archivo{" "}
                        {isNewVersion && "(requerido para la nueva versión)"}
                      </FormLabel>
                      <FormControl>
                        <div className="relative flex w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-card p-8 hover:bg-muted/50">
                          <UploadCloud className="mb-2 h-10 w-10 text-muted-foreground" />
                          <div className="text-center">
                            <p className="font-semibold">
                              Click para subir o arrastra y suelta
                            </p>
                            <p className="text-xs text-muted-foreground">
                              PDF, DOCX, XLSX (max. 25MB)
                            </p>
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
                          <strong>Archivo seleccionado:</strong> {fileToUpload.name} (
                          {(fileToUpload.size / 1024 / 1024).toFixed(2)} MB)
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
            <CardHeader>
              <CardTitle>F) Etiquetas</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (Opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="IAAS, consentimiento, urgencia..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>Separa las etiquetas con comas.</FormDescription>
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
              <p className="text-sm text-muted-foreground">
                {Math.round(uploadProgress) === 100
                  ? "Finalizando..."
                  : `Progreso: ${Math.round(uploadProgress)}%`}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
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
              {isNewVersion
                ? "Crear Versión"
                : isEditing
                ? "Guardar Cambios"
                : "Subir Documento"}
            </Button>
          </div>
        </form>
      </Form>
    );
  }

  return (
    <>
      <Stepper currentStep={step} />
      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <div className="min-h-[450px]">
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Paso 1: Carga e Identificación</CardTitle>
                  <CardDescription>
                    Comienza subiendo tu archivo y dándole un título claro y
                    descriptivo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  <FormField
                    control={form.control}
                    name="file"
                    render={() => (
                      <FormItem>
                        <FormLabel>Seleccionar archivo</FormLabel>
                        <FormControl>
                          <div className="relative flex w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-card p-8 hover:bg-muted/50">
                            <UploadCloud className="mb-2 h-10 w-10 text-muted-foreground" />
                            <div className="text-center">
                              <p className="font-semibold">
                                Click para subir o arrastra y suelta
                              </p>
                              <p className="text-xs text-muted-foreground">
                                PDF, DOCX, XLSX (max. 25MB)
                              </p>
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
                            <strong>Archivo seleccionado:</strong> {fileToUpload.name} (
                            {(fileToUpload.size / 1024 / 1024).toFixed(2)} MB)
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="titulo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título del documento</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: Protocolo de Higiene de Manos"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="descripcion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción (Opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe brevemente el propósito del documento..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Paso 2: Clasificación y Detalles</CardTitle>
                  <CardDescription>
                    Clasifica el documento según los estándares de acreditación y
                    define su estado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tipoDocumentoId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de documento</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[...catalogs.tiposDocumento]
                                .sort((a, b) => a.nombre.localeCompare(b.nombre))
                                .map((tipo) => (
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
                      name="estadoDocId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado del documento</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un estado" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[...catalogs.estadosAcreditacionDoc]
                                .sort((a, b) => a.nombre.localeCompare(b.nombre))
                                .map((estado) => (
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
                  </div>

                  <Separator className="my-4" />

                  <FormField
                    control={form.control}
                    name="ambitoId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ámbito</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("caracteristicaId", "");
                            form.setValue("elementoMedibleId", "");
                          }}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un ámbito" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[...catalogs.ambitos]
                              .sort((a, b) => a.orden - b.orden)
                              .map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.nombre}
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
                    name="caracteristicaId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Característica</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("elementoMedibleId", "");
                          }}
                          value={field.value || ""}
                          disabled={!ambitoId}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  !ambitoId
                                    ? "Selecciona un ámbito primero"
                                    : "Selecciona una característica"
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredCaracteristicas.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.codigo} - {c.nombre}
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
                    name="elementoMedibleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Elemento medible</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            const selectedElemento = catalogs.elementosMedibles.find(
                              (e) => e.id === value
                            );
                            if (selectedElemento?.servicioIds) {
                              form.setValue("servicioIds", selectedElemento.servicioIds, {
                                shouldValidate: true,
                              });
                            } else {
                              form.setValue("servicioIds", [], {
                                shouldValidate: true,
                              });
                            }
                          }}
                          value={field.value || ""}
                          disabled={!caracteristicaId}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  !caracteristicaId
                                    ? "Selecciona una característica primero"
                                    : "Selecciona un elemento"
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredElementos.map((e) => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.codigo} - {e.nombre}
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

            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Paso 3: Contexto y Fechas</CardTitle>
                  <CardDescription>
                    Asigna responsables, servicios asociados y las fechas clave del
                    documento.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  <FormField
                    control={form.control}
                    name="responsableNombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Responsable</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Dra. Ana Reyes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="responsableEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email del Responsable</FormLabel>
                        <FormControl>
                          <Input placeholder="ej: a.reyes@hospital.cl" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
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
                                {[...catalogs.servicios]
                                  .sort((a, b) => a.nombre.localeCompare(b.nombre))
                                  .map((servicio) => (
                                    <FormItem
                                      key={servicio.id}
                                      className="flex flex-row items-center space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(servicio.id)}
                                          onCheckedChange={(checked) => {
                                            const currentValues = field.value || [];
                                            return checked
                                              ? field.onChange([
                                                  ...currentValues,
                                                  servicio.id,
                                                ])
                                              : field.onChange(
                                                  currentValues.filter(
                                                    (id) => id !== servicio.id
                                                  )
                                                );
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {servicio.nombre}
                                      </FormLabel>
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

                  <Separator className="my-4" />

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DateInputField
                      control={form.control}
                      name="fechaDocumento"
                      label="Fecha del documento"
                      description="Puedes escribir la fecha manualmente o usar el calendario del navegador."
                      required
                      max={toDateInputValue(new Date())}
                    />

                    <DateInputField
                      control={form.control}
                      name="fechaVigenciaDesde"
                      label="Vigencia Desde"
                      description="Puedes modificarla manualmente si lo necesitas."
                    />

                    <DateInputField
                      control={form.control}
                      name="fechaVigenciaHasta"
                      label="Vigencia Hasta"
                      description="Puedes modificarla manualmente si lo necesitas."
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle>Paso 4: Extras y Finalizar</CardTitle>
                  <CardDescription>
                    Añade etiquetas para facilitar la búsqueda y vincula el
                    documento si es necesario.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Etiquetas (Opcional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="IAAS, consentimiento, urgencia..."
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Separa las etiquetas con comas para una mejor organización y
                          búsqueda.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isLinkableDocType && (
                    <>
                      <Separator />
                      <FormField
                        control={form.control}
                        name="linkedDocumentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Vincular a Documento Principal (Opcional)
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || ""}
                              disabled={
                                !hasClassification || linkableDocuments.length === 0
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={
                                      !hasClassification
                                        ? "Completa la clasificación para filtrar"
                                        : "No hay documentos que coincidan"
                                    }
                                  />
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
                            <FormDescription>
                              Si este documento es una pauta o indicador, selecciona el
                              documento que verifica.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <Separator />
                  <div className="p-4 bg-muted/50 rounded-lg border text-center">
                    <h3 className="font-semibold">¡Todo listo!</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Has completado todos los pasos. Haz clic en "Subir Documento"
                      para finalizar.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {isSubmitting && (
            <div className="space-y-2 pt-4">
              <Label>Subiendo documento...</Label>
              <Progress value={uploadProgress} />
              <p className="text-sm text-muted-foreground">
                {Math.round(uploadProgress) === 100
                  ? "Finalizando..."
                  : `Progreso: ${Math.round(uploadProgress)}%`}
              </p>
            </div>
          )}

          <div className="flex justify-between gap-4 pt-4">
            <div>
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrev}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Anterior
                </Button>
              )}
            </div>
            <div>
              {step < 4 ? (
                <Button type="button" onClick={handleNext} disabled={isSubmitting}>
                  Siguiente
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="mr-2 h-4 w-4" />
                  )}
                  Subir Documento
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}