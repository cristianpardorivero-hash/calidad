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
import { ref, getBlob, getDownloadURL } from "firebase/storage";

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
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !documento) {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
      }
      return;
    }
    
    let isCancelled = false;
    let localUrl: string | null = null;

    const setupPreview = async () => {
      const ext = documento.fileExt?.toLowerCase() || "";
      if (ext !== "pdf") {
        setLoading(false);
        setError(null);
        setObjectUrl(null);
        return;
      }
      
      setLoading(true);
      setError(null);
      setObjectUrl(null);

      try {
        const storageRef = ref(storage, documento.storagePath);
        const blob = await getBlob(storageRef);
        localUrl = URL.createObjectURL(blob);

        if (!isCancelled) {
          setObjectUrl(localUrl);
        }
      } catch (e: any) {
        console.error("Error getting PDF blob:", e);
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
    
    setupPreview();

    return () => {
      isCancelled = true;
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
    };
  }, [isOpen, documento, objectUrl]);

  const handleDownload = async () => {
    if (!documento) return;
    try {
      const storageRef = ref(storage, documento.storagePath);
      const urlToDownload = await getDownloadURL(storageRef);
      const link = document.createElement("a");
      link.href = urlToDownload;
      link.target = '_blank';
      link.download = documento.fileName || "documento.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Error generating download link:", e);
      setError("No se pudo generar el enlace de descarga.");
    }
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

    if (documento && (documento.fileExt?.toLowerCase() || "") !== "pdf") {
      return (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-muted rounded-lg h-[70vh]">
          <FileText className="h-16 w-16 text-muted-foreground" />
          <p className="mt-4 font-semibold">No hay previsualización disponible</p>
          <p className="text-muted-foreground text-sm mt-1">
            Este visor solo admite archivos <strong>PDF</strong>.
          </p>
          <p className="text-muted-foreground text-sm">Puedes descargar el archivo para verlo.</p>
        </div>
      );
    }

    if (objectUrl) {
      return (
        <div className="h-[70vh] w-full rounded-md border overflow-hidden bg-white">
          <object
            data={objectUrl}
            type="application/pdf"
            className="w-full h-full"
          >
            <div className="flex h-full items-center justify-center bg-muted p-6 text-center">
              <div>
                <p className="font-semibold text-foreground">El navegador no pudo mostrar el PDF.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Intenta descargarlo para abrirlo en tu dispositivo.
                </p>
              </div>
            </div>
          </object>
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
            Previsualización del documento PDF. Puedes descargarlo si lo necesitas.
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
            <Button
              onClick={handleDownload}
              disabled={!documento}
            >
              <Download className="mr-2 h-4 w-4" />
              Descargar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
