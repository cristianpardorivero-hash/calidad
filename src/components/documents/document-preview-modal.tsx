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

    const ext = documento.fileExt?.toLowerCase();

    if (ext !== "pdf") {
      setFileUrl(null);
      setError(null);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);

    const loadUrl = async () => {

      try {

        const storageRef = ref(storage, documento.storagePath);
        const url = await getDownloadURL(storageRef);

        if (!cancelled) {
          setFileUrl(url);
        }

      } catch (e: any) {

        console.error("Error loading PDF:", e);

        if (!cancelled) {

          if (e?.code === "storage/object-not-found") {
            setError("El archivo no existe en el servidor.");
          }
          else if (e?.code === "storage/unauthorized") {
            setError("No tienes permiso para acceder a este documento.");
          }
          else {
            setError("Error al cargar la previsualización del documento.");
          }

        }

      } finally {

        if (!cancelled) {
          setLoading(false);
        }

      }

    };

    loadUrl();

    return () => {
      cancelled = true;
    };

  }, [isOpen, documento]);



  const handleDownload = () => {

    const url = fileUrl || documento?.downloadUrl;

    if (!url || !documento) return;

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

    if (documento?.fileExt?.toLowerCase() !== "pdf") {

      return (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-muted rounded-lg h-[70vh]">
          <FileText className="h-16 w-16 text-muted-foreground" />

          <p className="mt-4 font-semibold">
            No hay previsualización disponible
          </p>

          <p className="text-muted-foreground text-sm mt-1">
            Este visor solo permite visualizar archivos <strong>PDF</strong>.
          </p>

          <p className="text-muted-foreground text-sm">
            Puedes descargar el archivo para verlo.
          </p>
        </div>
      );

    }

    if (fileUrl) {

      return (
        <div className="h-[70vh] w-full rounded-md border overflow-hidden bg-white">

          {/* visor principal */}
          <iframe
            src={fileUrl}
            className="w-full h-full"
            title={documento?.titulo || "Vista previa PDF"}
          />

          {/* fallback */}
          <object
            data={fileUrl}
            type="application/pdf"
            className="hidden"
          >
            <div className="flex h-full items-center justify-center p-6 text-center">

              <div>

                <p className="font-semibold">
                  No se pudo mostrar el PDF en el navegador
                </p>

                <p className="text-sm text-muted-foreground mt-2">
                  Usa el botón Descargar para abrirlo.
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

          <DialogTitle className="truncate pr-8">
            {documento?.titulo}
          </DialogTitle>

          <DialogDescription>
            Previsualización del documento PDF.
          </DialogDescription>

        </DialogHeader>


        <div className="flex-1 min-h-0">

          {renderContent()}

        </div>


        <DialogFooter className="pt-4">

          <div className="flex gap-2">

            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
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