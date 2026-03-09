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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !documento) {
            setIsLoading(true);
            setError(null);
            setPreviewUrl(null);
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setPreviewUrl(null);
        
        const ext = documento.fileExt?.toLowerCase();
        const isValidUrl = documento.downloadUrl && (documento.downloadUrl.startsWith('http://') || documento.downloadUrl.startsWith('https://'));

        if (!isValidUrl) {
            setError(`La URL del documento es inválida o está ausente. No se puede previsualizar.`);
            setIsLoading(false);
            return;
        }

        if (ext === "pdf") {
            const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(documento.downloadUrl)}&embedded=true`;
            setPreviewUrl(googleViewerUrl);
            // We can't know for sure when the iframe finishes loading, but we can stop our own loader.
            setIsLoading(false);
        } else {
            // For non-PDFs, just show the info card.
            setIsLoading(false);
        }

  }, [isOpen, documento]);

  const handleOpenNewTab = () => {
    if (!documento?.downloadUrl) return;
    window.open(documento.downloadUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownload = () => {
    if (!documento?.downloadUrl) return;
    const link = document.createElement("a");
    link.href = documento.downloadUrl;
    link.download = documento.fileName || "documento";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderContent = () => {
    if (!documento) return null;
    
    if (isLoading) {
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
          <AlertTitle>Error de Previsualización</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (previewUrl) {
      return (
        <div className="h-[70vh] w-full rounded-md border overflow-hidden bg-background">
          <iframe
            src={previewUrl}
            title={documento.titulo || "Vista previa PDF"}
            className="w-full h-full"
            onLoad={() => setIsLoading(false)} // This helps for some cases but might not be perfect
          />
        </div>
      );
    }
    
    // Fallback for non-PDFs or other cases
    return (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-muted rounded-lg h-[70vh]">
            <FileText className="h-16 w-16 text-muted-foreground" />
            <p className="mt-4 font-semibold">Previsualización no disponible</p>
            <p className="text-muted-foreground text-sm mt-1">
                Solo los archivos PDF pueden ser previsualizados. El archivo actual es <strong>.{documento.fileExt}</strong>.
            </p>
        </div>
    );
  };

  const isUrlValid = documento?.downloadUrl && (documento.downloadUrl.startsWith('http://') || documento.downloadUrl.startsWith('https://'));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{documento?.titulo}</DialogTitle>
          <DialogDescription>
            {documento?.fileExt === 'pdf' ? 'Previsualización del documento PDF.' : `Archivo: ${documento?.fileName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {renderContent()}
        </div>

        <DialogFooter className="pt-4 flex-wrap sm:justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>

            <Button
              variant="outline"
              onClick={handleOpenNewTab}
              disabled={!isUrlValid}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir en Pestaña
            </Button>

            <Button
              onClick={handleDownload}
              disabled={!isUrlValid}
            >
              <Download className="mr-2 h-4 w-4" />
              Descargar
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
