'use client';

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, UploadCloud } from "lucide-react";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useUser } from "@/hooks/use-user";
import { addLibraryDocument } from "@/lib/data";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "../ui/progress";
import { Label } from "../ui/label";
import { storage } from "@/firebase/client";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { type LibraryDocument } from "@/lib/types";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["pdf", "docx", "xlsx", "pptx", "jpg", "png", "zip"];

function getSafeFileName(fileName: string): string {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

const formSchema = z.object({
  titulo: z.string().min(5, "El título debe tener al menos 5 caracteres."),
  descripcion: z.string().optional(),
  categoria: z.string().optional(),
  tags: z.string().optional(),
  file: z.any().refine((file) => !!file, "El archivo es requerido."),
});

type FormValues = z.infer<typeof formSchema>;

export function LibraryDocumentForm() {
  const { user, firebaseUser } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: "",
      descripcion: "",
      categoria: "",
      tags: "",
      file: null,
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt as any)) {
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
  };
  
  const uploadFile = (file: File, hospitalId: string): Promise<{ downloadURL: string; storagePath: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const safeFileName = getSafeFileName(file.name);
      const storagePath = `biblioteca/${hospitalId}/${Date.now()}-${safeFileName}`;
      const storageRef = ref(storage, storagePath);
  
      const uploadTask = uploadBytesResumable(storageRef, file, { contentType: file.type });
  
      uploadTask.on( "state_changed",
        (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
        (error) => {
          console.error("Upload error:", error);
          let errorMessage = "No se pudo subir el archivo. ";
          switch (error.code) {
            case 'storage/unauthorized':
              errorMessage += "Revisa los permisos de Storage.";
              break;
            case 'storage/canceled':
              errorMessage += "La subida fue cancelada.";
              break;
            default:
              errorMessage += "Error desconocido.";
              break;
          }
          toast({ 
            variant: "destructive", 
            title: "Error de Subida", 
            description: errorMessage
          });
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ downloadURL, storagePath, mimeType: file.type });
          } catch (error) {
            toast({ variant: "destructive", title: "Error de Subida", description: "No se pudo obtener la URL del archivo." });
            reject(error);
          }
        }
      );
    });
  };

  async function onSubmit(values: FormValues) {
    if (!user || !firebaseUser || !values.file) {
      toast({ variant: "destructive", title: "Error", description: "No se ha podido verificar el usuario o falta el archivo." });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const uploadResult = await uploadFile(values.file, user.hospitalId);
      
      const tagsArray = values.tags?.split(",").map(t => t.trim()).filter(Boolean) || [];

      const searchKeywords = [
        values.titulo.toLowerCase(),
        values.descripcion?.toLowerCase(),
        values.categoria?.toLowerCase(),
        ...tagsArray.map(t => t.toLowerCase())
      ].filter(Boolean) as string[];

      const docData: Omit<LibraryDocument, "id" | "createdAt" | "updatedAt"> = {
        hospitalId: user.hospitalId,
        titulo: values.titulo,
        descripcion: values.descripcion || "",
        categoria: values.categoria || "",
        tags: tagsArray,
        fileName: values.file.name,
        fileExt: values.file.name.split(".").pop() || "",
        fileSize: values.file.size,
        mimeType: uploadResult.mimeType,
        storagePath: uploadResult.storagePath,
        downloadUrl: uploadResult.downloadURL,
        createdByUid: firebaseUser.uid,
        createdByEmail: firebaseUser.email || "N/A",
        isDeleted: false,
        searchKeywords: [...new Set(searchKeywords)],
      };

      await addLibraryDocument(docData);

      toast({ title: "Documento Subido", description: `"${values.titulo}" se ha añadido a la biblioteca.` });
      router.push("/biblioteca");

    } catch (e: any) {
      console.error("Submission failed", e);
      // Toasts for upload errors are now handled inside the uploadFile function.
      // Firestore errors will be thrown by addLibraryDocument and should be caught if needed.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Documento</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <FormField control={form.control} name="titulo" render={({ field }) => (
              <FormItem><FormLabel>Título</FormLabel><FormControl><Input placeholder="Ej: Manual de Inducción para Personal Nuevo" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="descripcion" render={({ field }) => (
              <FormItem><FormLabel>Descripción (Opcional)</FormLabel><FormControl><Textarea placeholder="Resume el contenido o propósito del documento..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="categoria" render={({ field }) => (
                <FormItem><FormLabel>Categoría (Opcional)</FormLabel><FormControl><Input placeholder="Ej: Manuales, Guías Clínicas" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="tags" render={({ field }) => (
                <FormItem><FormLabel>Etiquetas (Opcional)</FormLabel><FormControl><Input placeholder="inducción, RRHH, onboarding..." {...field} /></FormControl><FormDescription>Separa las etiquetas con comas.</FormDescription><FormMessage /></FormItem>
                )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Archivo</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField control={form.control} name="file" render={() => (
              <FormItem><FormLabel>Seleccionar archivo</FormLabel><FormControl>
                <div className="relative flex w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-card p-8 hover:bg-muted/50">
                  <UploadCloud className="mb-2 h-10 w-10 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-semibold">Click para subir o arrastra y suelta</p>
                    <p className="text-xs text-muted-foreground">{ALLOWED_EXTENSIONS.join(", ").toUpperCase()} (máx. 25MB)</p>
                  </div>
                  <Input type="file" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={handleFileChange} />
                </div>
              </FormControl>
              {fileToUpload && <div className="mt-4 text-sm text-muted-foreground"><strong>Archivo seleccionado:</strong> {fileToUpload.name}</div>}
              <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {isSubmitting && (
          <div className="space-y-2"><Label>Subiendo documento...</Label><Progress value={uploadProgress} /></div>
        )}

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar en Biblioteca
          </Button>
        </div>
      </form>
    </Form>
  );
}
