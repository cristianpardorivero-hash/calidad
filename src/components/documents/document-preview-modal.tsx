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
  ExternalLink,
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

    const ext = documento.fileExt?.toLowerCase() || "";

    if (ext !== "pdf") {
      setLoading(false);
      setError(null);
      setFileUrl(null);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);
    setFileUrl(null);

    const fetchFileUrl = async () => {
      try {
        const storageRef = ref(storage, documento.storagePath);
        const url = await getDownloadURL(storageRef);

        if (!cancelled) {
          setFileUrl(url);
        }
      } catch (e: any) {
        console.error("Error getting PDF URL:", e);

        if (!cancelled) {
          if (e?.code === "storage/object-not-found") {
            setError("El archivo no se encontró en el servidor.");
          } else if (e?.code === "storage/unauthorized") {
            setError("No tienes permiso para ver este archivo.");
          } else {
            setError("Ocurrió un error al cargar el documento.");
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchFileUrl();

    return () => {
      cancelled = true;
    };
  }, [isOpen, documento]);

  const handleOpenPdf = () => {
    const url = fileUrl || documento?.downloadUrl;
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDownload = () => {
    const url = fileUrl || documento?.downloadUrl;
    if (!documento || !url) return;

    const link = document.createElement("a");
    link.href = url;
    link.download = documento.fileName || "documento.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-[50vh] w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error de documento</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (documento?.fileExt?.toLowerCase() !== "pdf") {
      return (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-muted rounded-lg h-[50vh]">
          <FileText className="h-16 w-16 text-muted-foreground" />
          <p className="mt-4 font-semibold">Este visor solo admite PDF</p>
          <p className="text-muted-foreground text-sm mt-1">
            El archivo actual es <strong>.{documento?.fileExt}</strong>.
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center text-center p-8 bg-muted rounded-lg h-[50vh]">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <p className="mt-4 font-semibold">Documento PDF listo</p>
        <p className="text-muted-foreground text-sm mt-1">
          Usa los botones para abrirlo en una pestaña nueva o descargarlo.
        </p>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{documento?.titulo}</DialogTitle>
          <DialogDescription>
            Acceso al documento PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {renderContent()}
        </div>

        <DialogFooter className="pt-4">
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>

            <Button
              variant="outline"
              onClick={handleOpenPdf}
              disabled={!fileUrl && !documento?.downloadUrl}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir PDF
            </Button>

            <Button
              onClick={handleDownload}
              disabled={!fileUrl && !documento?.downloadUrl}
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
