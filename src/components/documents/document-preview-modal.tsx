'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, FileText, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import type { Documento } from "@/lib/types";
import { storage } from "@/lib/firebase";
import { ref, getBlob } from "firebase/storage";

interface DocumentPreviewModalProps {
  documento: Documento | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function DocumentPreviewModal({ documento, isOpen, onOpenChange }: DocumentPreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;

    if (isOpen && documento) {
      // Only PDF files can be previewed
      if (documento.fileExt !== 'pdf') {
        setPreviewUrl(null);
        setError(null);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      setPreviewUrl(null);

      const fetchBlob = async () => {
        try {
          const storageRef = ref(storage, documento.storagePath);
          const blob = await getBlob(storageRef);
          objectUrl = URL.createObjectURL(blob);
          setPreviewUrl(objectUrl);
        } catch (e: any) {
          console.error("Error creating blob URL for preview:", e);
          if (e.code === 'storage/object-not-found') {
            setError("El archivo no se encontró en el servidor.");
          } else if (e.code === 'storage/unauthorized') {
            setError("No tienes permiso para ver este archivo.");
          } else {
            setError("Ocurrió un error al intentar cargar la previsualización.");
          }
        } finally {
          setLoading(false);
        }
      };

      fetchBlob();
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isOpen, documento]);

  const renderContent = () => {
    if (loading) {
      return <Skeleton className="h-[70vh] w-full" />;
    }
    if (error) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error de Previsualización</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }
    if (documento && documento.fileExt !== 'pdf') {
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-muted rounded-lg h-[70vh]">
                <FileText className="h-16 w-16 text-muted-foreground" />
                <p className="mt-4 font-semibold">No hay previsualización disponible</p>
                <p className="text-muted-foreground text-sm mt-1">
                    No se pueden previsualizar archivos de tipo <strong>.{documento.fileExt}</strong>.
                </p>
                <p className="text-muted-foreground text-sm">Puedes descargarlo para verlo.</p>
            </div>
        )
    }
    if (previewUrl) {
      return (
        <object data={previewUrl} type="application/pdf" className="h-[70vh] w-full rounded-md border">
          <p className="text-center text-muted-foreground p-4">
            Parece que tu navegador no puede mostrar el PDF. Intenta descargarlo.
          </p>
        </object>
      );
    }
    return null;
  };

  const handleDownload = () => {
    if (!documento) return;

    // Use the reliable blob URL if available
    const url = previewUrl || documento.downloadUrl;
    const link = document.createElement('a');
    link.href = url;
    link.download = documento.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{documento?.titulo}</DialogTitle>
          <DialogDescription>
            Previsualización del documento. Puedes descargarlo si lo necesitas.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          {renderContent()}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={handleDownload} disabled={!documento?.downloadUrl}>
              <Download className="mr-2 h-4 w-4" />
              Descargar Archivo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
