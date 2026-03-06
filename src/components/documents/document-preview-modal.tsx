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
} from "lucide-react";
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
    if (!documento) {
        return null;
    }
    
    if (documento.fileExt?.toLowerCase() !== "pdf") {
      return (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-muted rounded-lg h-[50vh]">
          <FileText className="h-16 w-16 text-muted-foreground" />
          <p className="mt-4 font-semibold">Este visor solo admite PDF</p>
          <p className="text-muted-foreground text-sm mt-1">
            El archivo actual es <strong>.{documento.fileExt}</strong>.
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
