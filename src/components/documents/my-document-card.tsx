'use client';

import type { Catalogs, Documento } from "@/lib/types";
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
import { useEffect, useMemo, useState } from "react";
import { getLinkedDocuments } from "@/lib/data";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { DocumentPreviewModal } from "./document-preview-modal";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "../ui/skeleton";
import { Separator } from "../ui/separator";

interface MyDocumentCardProps {
  document: Documento;
  catalogs: Catalogs;
}

export function MyDocumentCard({ document, catalogs }: MyDocumentCardProps) {
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
  
  const { statusName, statusVariant } = useMemo(() => {
    if (!catalogs || !document.estadoDocId) {
      return { statusName: '', statusVariant: 'secondary' as const };
    }
    const status = catalogs.estadosAcreditacionDoc.find(s => s.id === document.estadoDocId);
    
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
    switch (document.estadoDocId) {
      case 'est-vig': variant = 'default'; break;
      case 'est-rev': variant = 'secondary'; break;
      case 'est-obs': variant = 'destructive'; break;
      case 'est-sus': variant = 'outline'; break;
    }
    return { statusName: status?.nombre || 'Desconocido', statusVariant: variant };
  }, [document.estadoDocId, catalogs]);


  return (
    <>
      <Card className="flex flex-col transition-shadow duration-300 hover:shadow-xl border-transparent hover:border-primary/50 bg-card">
        <CardHeader className="pb-3">
            <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">v{document.version}</Badge>
                <Badge variant={statusVariant} className="text-xs">{statusName}</Badge>
            </div>
          <CardTitle className="text-base font-semibold leading-tight line-clamp-2 h-10">
            {document.titulo}
          </CardTitle>
          <CardDescription className="text-xs pt-1">
            Actualizado {formatDistanceToNow(document.updatedAt, { addSuffix: true, locale: es })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow space-y-3 text-sm">
            <p className="text-muted-foreground line-clamp-3 h-[60px]">
                {document.descripcion || "Este documento no tiene una descripción."}
            </p>
            
            {isLoadingLinks ? (
                 <div className="space-y-2 pt-2">
                    <Separator className="my-3"/>
                    <Skeleton className="h-4 w-3/4"/>
                    <Skeleton className="h-4 w-1/2"/>
                 </div>
            ) : linkedDocuments.length > 0 && (
                <>
                <Separator className="my-3"/>
                <div className="space-y-2">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                        <LinkIcon className="h-3 w-3"/> Documentos Vinculados
                    </h4>
                    <div className="space-y-1.5">
                        {linkedDocuments.slice(0, 2).map(linkedDoc => (
                            <Link key={linkedDoc.id} href={`/documentos/${linkedDoc.id}`} className="text-xs text-primary hover:underline flex items-center gap-2 group">
                                <FileText className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0"/>
                                <span className="truncate">{linkedDoc.titulo}</span>
                            </Link>
                        ))}
                         {linkedDocuments.length > 2 && (
                             <p className="text-xs text-muted-foreground pl-5">+ {linkedDocuments.length - 2} más</p>
                         )}
                    </div>
                </div>
                </>
            )}
        </CardContent>
        <CardFooter>
          <Button variant="secondary" className="w-full" onClick={() => setIsPreviewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Vista Rápida
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
