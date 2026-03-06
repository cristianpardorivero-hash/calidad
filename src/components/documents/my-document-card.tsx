'use client';

import type { Documento } from "@/lib/types";
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
import { Eye, Link as LinkIcon, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { getLinkedDocuments } from "@/lib/data";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { DocumentPreviewModal } from "./document-preview-modal";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "../ui/skeleton";

interface MyDocumentCardProps {
  document: Documento;
}

export function MyDocumentCard({ document }: MyDocumentCardProps) {
  const { user } = useAuth();
  const [linkedDocuments, setLinkedDocuments] = useState<Documento[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (user?.hospitalId) {
      setIsLoadingLinks(true);
      getLinkedDocuments(document.id, user.hospitalId)
        .then(setLinkedDocuments)
        .finally(() => setIsLoadingLinks(false));
    }
  }, [document.id, user?.hospitalId]);

  return (
    <>
      <Card className="flex flex-col transition-shadow hover:shadow-lg">
        <CardHeader>
          <CardTitle className="truncate text-lg">{document.titulo}</CardTitle>
          <CardDescription>
            Actualizado {formatDistanceToNow(document.updatedAt, { addSuffix: true, locale: es })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow space-y-4">
            <div className="flex gap-2">
                <Badge variant="outline">v{document.version}</Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                {document.descripcion || "Sin descripción."}
            </p>
            
            {isLoadingLinks ? (
                 <div className="space-y-2 pt-2">
                    <Skeleton className="h-4 w-3/4"/>
                    <Skeleton className="h-4 w-1/2"/>
                 </div>
            ) : linkedDocuments.length > 0 && (
                <div className="pt-2">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-muted-foreground"/> Documentos Vinculados
                    </h4>
                    <div className="space-y-2">
                        {linkedDocuments.map(linkedDoc => (
                            <Link key={linkedDoc.id} href={`/documentos/${linkedDoc.id}`} className="text-sm text-primary hover:underline flex items-center gap-2 group">
                                <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0"/>
                                <span className="truncate">{linkedDoc.titulo}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={() => setIsPreviewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Ver Documento
          </Button>
        </CardFooter>
      </Card>
      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        documento={document}
      />
    </>
  );
}
