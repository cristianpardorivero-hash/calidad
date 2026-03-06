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
import { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !documento) return;

    const ext = documento.fileExt?.toLowerCase();
    if (ext !== "pdf") {
      setPreviewUrl(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (!documento.downloadUrl) {
      setPreviewUrl(null);
      setError("El documento no tiene URL de descarga.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    const loadPdfAsBlob = async () => {
      try {
        setLoading(true);
        setError(null);
        setPreviewUrl(null);

        const response = await fetch(documento.downloadUrl);
        if (!response.ok) {
          throw new Error(`No se pudo descargar el PDF (${response.status}).`);
        }

        const blob = await response.blob();

        if (blob.type && !blob.type.includes("pdf")) {
          console.warn("Blob recibido con content-type:", blob.type);
        }

        objectUrl = URL.createObjectURL(blob);

        if (!cancelled) {
          setPreviewUrl(objectUrl);
        }
      } catch (e: any) {
        console.error("Error cargando PDF como blob:", e);
        if (!cancelled) {
          setError("No se pudo cargar el PDF dentro del visor. Puedes abrirlo en una pestaña nueva.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPdfAsBlob();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, documento]);

  const handleOpenPdf = () => {
    if (!documento?.downloadUrl) return;
    window.open(documento.downloadUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownload = () => {
    if (!documento?.downloadUrl) return;

    const link = document.createElement("a");
    link.href = documento.downloadUrl;
    link.download = documento.fileName || "documento.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderContent = () => {
    if (!documento) return null;

    if (documento.fileExt?.toLowerCase() !== "pdf") {
      return (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-muted rounded-lg h-[70vh]">
          <FileText className="h-16 w-16 text-muted-foreground" />
          <p className="mt-4 font-semibold">Este visor solo admite PDF</p>
          <p className="text-muted-foreground text-sm mt-1">
            El archivo actual es <strong>.{documento.fileExt}</strong>.
          </p>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="flex h-[70vh] items-center justify-center">
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

    if (previewUrl) {
      return (
        <div className="h-[70vh] w-full rounded-md border overflow-hidden bg-white">
          <iframe
            src={previewUrl}
            title={documento.titulo || "Vista previa PDF"}
            className="w-full h-full"
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center text-center p-8 bg-muted rounded-lg h-[70vh]">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <p className="mt-4 font-semibold">Documento PDF listo</p>
        <p className="text-muted-foreground text-sm mt-1">
          Usa los botones para abrirlo o descargarlo.
        </p>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{documento?.titulo}</DialogTitle>
          <DialogDescription>
            Previsualización del documento PDF.
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
              disabled={!documento?.downloadUrl}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir PDF
            </Button>

            <Button
              onClick={handleDownload}
              disabled={!documento?.downloadUrl}
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
