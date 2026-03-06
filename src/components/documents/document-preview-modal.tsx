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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Download,
  FileText,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { Documento } from "@/lib/types";
import { storage } from "@/firebase/client";
import { ref, getDownloadURL } from "firebase/storage";

interface DocumentPreviewModalProps {
  documento: Documento | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function DocumentPreviewModal({
  documento,
  isOpen,
  onOpenChange,
}: DocumentPreviewModalProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !documento) return;

    if (documento.fileExt?.toLowerCase() !== "pdf") {
      setLoading(false);
      setError(null);
      setFileUrl(null);
      return;
    }

    let isCancelled = false;

    setLoading(true);
    setError(null);
    setFileUrl(null);

    const fetchFileUrl = async () => {
      try {
        const storageRef = ref(storage, documento.storagePath);
        const url = await getDownloadURL(storageRef);

        if (!isCancelled) {
          setFileUrl(url);
        }
      } catch (e: any) {
        console.error("Error getting PDF URL:", e);

        if (!isCancelled) {
          if (e?.code === "storage/object-not-found") {
            setError("El archivo no se encontró en el servidor.");
          } else if (e?.code === "storage/unauthorized") {
            setError("No tienes permiso para ver este archivo.");
          } else {
            setError("Ocurrió un error al cargar la previsualización del PDF.");
          }
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchFileUrl();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, documento]);

  const handleDownload = () => {
    if (!documento || !fileUrl) return;

    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = documento.fileName || "documento.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-[70vh] w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive" className="h-full">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error de previsualización</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (documento && documento.fileExt?.toLowerCase() !== "pdf") {
      return (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-muted rounded-lg h-[70vh]">
          <FileText className="h-16 w-16 text-muted-foreground" />
          <p className="mt-4 font-semibold">No hay previsualización disponible</p>
          <p className="text-muted-foreground text-sm mt-1">
            No se pueden previsualizar archivos de tipo <strong>.{documento.fileExt}</strong>.
          </p>
          <p className="text-muted-foreground text-sm">Puedes descargarlo para verlo.</p>
        </div>
      );
    }

    if (fileUrl) {
      return (
        <div className="h-[70vh] w-full rounded-md border overflow-hidden bg-white">
          <iframe
            src={fileUrl}
            title={documento?.titulo || "Vista previa PDF"}
            className="w-full h-full"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{documento?.titulo}</DialogTitle>
          <DialogDescription>
            Previsualización del documento. Puedes descargarlo si lo necesitas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {renderContent()}
        </div>

        <DialogFooter className="pt-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button onClick={handleDownload} disabled={!documento || !fileUrl}>
              <Download className="mr-2 h-4 w-4" />
              Descargar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
