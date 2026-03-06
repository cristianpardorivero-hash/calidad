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
  ExternalLink,
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
    if (!isOpen || !documento) {
      setFileUrl(null);
      setError(null);
      setLoading(false);
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
        console.error("Error getting file URL:", e);

        if (!isCancelled) {
          if (e?.code === "storage/object-not-found") {
            setError("El archivo no se encontró en el servidor.");
          } else if (e?.code === "storage/unauthorized") {
            setError("No tienes permiso para ver este archivo.");
          } else {
            setError("Ocurrió un error al intentar acceder al archivo.");
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
    const urlToDownload = fileUrl || documento?.downloadUrl;
    if (!documento || !urlToDownload) return;

    const link = document.createElement("a");
    link.href = urlToDownload;
    link.download = documento.fileName || "documento";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col h-[200px] w-full items-center justify-center text-center p-8 bg-muted rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 font-semibold">Obteniendo enlace seguro...</p>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive" className="h-full">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error al obtener el archivo</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (fileUrl) {
       return (
        <div className="flex flex-col h-[200px] w-full items-center justify-center text-center p-8 bg-muted rounded-lg">
          <FileText className="h-16 w-16 text-muted-foreground" />
          <p className="mt-4 font-semibold">El archivo está listo</p>
          <p className="text-muted-foreground text-sm mt-1">
            Puedes abrirlo en una nueva pestaña o descargarlo a tu dispositivo.
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{documento?.titulo}</DialogTitle>
          <DialogDescription>
            Elige una acción para el documento.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 py-4">
          {renderContent()}
        </div>

        <DialogFooter className="pt-4">
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button
              asChild
              disabled={loading || !fileUrl}
            >
              <a href={fileUrl || ''} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir en nueva pestaña
              </a>
            </Button>
            <Button
              onClick={handleDownload}
              disabled={loading || !fileUrl}
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
