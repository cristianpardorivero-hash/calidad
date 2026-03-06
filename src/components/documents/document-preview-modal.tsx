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
import { Download, FileText, AlertTriangle, ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { useState, useEffect } from "react";
import type { Documento } from "@/lib/types";
import { storage } from "@/lib/firebase";
import { ref, getBlob } from "firebase/storage";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure the worker using a stable CDN URL with the correct version and .mjs extension.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

interface DocumentPreviewModalProps {
  documento: Documento | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function DocumentPreviewModal({ documento, isOpen, onOpenChange }: DocumentPreviewModalProps) {
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);

  useEffect(() => {
    if (isOpen && documento) {
      if (documento.fileExt !== 'pdf') {
        setLoading(false);
        setError(null);
        setFileBlob(null);
        return;
      }
      
      setLoading(true);
      setError(null);
      setFileBlob(null);
      setNumPages(0);
      setPageNumber(1);
      setScale(1.2);

      const fetchBlob = async () => {
        try {
          const storageRef = ref(storage, documento.storagePath);
          const blob = await getBlob(storageRef);
          setFileBlob(blob);
        } catch (e: any) {
          console.error("Error fetching blob for preview:", e);
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
  }, [isOpen, documento]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const handleDownload = () => {
    if (!documento) return;
    const url = fileBlob ? URL.createObjectURL(fileBlob) : documento.downloadUrl;
    const link = document.createElement('a');
    link.href = url;
    link.download = documento.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (fileBlob) {
        URL.revokeObjectURL(url);
    }
  }

  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1));
  const zoomOut = () => setScale(s => Math.max(0.6, s - 0.2));
  const zoomIn = () => setScale(s => Math.min(2.5, s + 0.2));

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-[70vh] w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
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
    if (fileBlob) {
      return (
        <div className="h-full w-full overflow-auto bg-muted/50 flex items-center justify-center rounded-md border p-4">
            <Document
                file={fileBlob}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(err) => setError(`Error al cargar el PDF: ${err.message}`)}
                loading={<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}
                error={
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error al renderizar el PDF</AlertTitle>
                        <AlertDescription>No se pudo mostrar el documento.</AlertDescription>
                    </Alert>
                }
            >
                <Page pageNumber={pageNumber} scale={scale} />
            </Document>
        </div>
      );
    }
    return null;
  };

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
        <DialogFooter className="flex-col sm:flex-row sm:justify-between items-center pt-4">
            <div className="flex items-center gap-2 flex-wrap">
                {numPages > 1 && (
                    <>
                        <Button variant="outline" onClick={goToPrevPage} disabled={pageNumber <= 1}>
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Anterior
                        </Button>
                        <p className="text-sm text-muted-foreground">
                            Página {pageNumber} de {numPages}
                        </p>
                        <Button variant="outline" onClick={goToNextPage} disabled={pageNumber >= numPages}>
                            Siguiente
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </>
                )}
                 <Button variant="outline" size="icon" onClick={zoomOut} disabled={scale <= 0.6}>
                    <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground w-12 text-center">{Math.round(scale * 100)}%</span>
                <Button variant="outline" size="icon" onClick={zoomIn} disabled={scale >= 2.5}>
                    <ZoomIn className="h-4 w-4" />
                </Button>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cerrar
                </Button>
                <Button onClick={handleDownload} disabled={!documento}>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
