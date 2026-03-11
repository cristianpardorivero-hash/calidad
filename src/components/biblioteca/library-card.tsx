'use client';

import type { LibraryDocument } from "@/lib/types";
import { Documento } from "@/lib/types"; // For casting
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, FileText, Calendar } from "lucide-react";
import { useState } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const DocumentPreviewModal = dynamic(
  () => import('../documents/document-preview-modal').then(mod => mod.DocumentPreviewModal),
  { ssr: false }
);

interface LibraryCardProps {
  document: LibraryDocument;
}

export function LibraryCard({ document }: LibraryCardProps) {
  const [docForPreview, setDocForPreview] = useState<Documento | null>(null);

  const handlePreview = () => {
    // Cast LibraryDocument to Documento for the modal
    const previewableDoc = document as unknown as Documento;
    setDocForPreview(previewableDoc);
  }

  return (
    <>
      <Card className="flex flex-col transition-shadow duration-300 hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <FileText className="h-8 w-8 text-primary flex-shrink-0" />
            {document.categoria && <Badge variant="secondary" className="truncate">{document.categoria}</Badge>}
          </div>
          <CardTitle className="text-base font-semibold leading-tight line-clamp-2 h-10 pt-2">
            {document.titulo}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow space-y-3 text-sm">
          <CardDescription className="line-clamp-3 h-[60px]">
            {document.descripcion || "Sin descripción."}
          </CardDescription>
           <div className="flex items-center text-xs text-muted-foreground pt-2 border-t">
              <Calendar className="mr-1.5 h-3.5 w-3.5" />
              Subido el {format(document.createdAt, "d MMM, yyyy", { locale: es })}
            </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={handlePreview}>
            <Eye className="mr-2 h-4 w-4" />
            Ver / Descargar
          </Button>
        </CardFooter>
      </Card>
      <DocumentPreviewModal
        isOpen={!!docForPreview}
        onOpenChange={(isOpen) => !isOpen && setDocForPreview(null)}
        documento={docForPreview}
      />
    </>
  );
}
