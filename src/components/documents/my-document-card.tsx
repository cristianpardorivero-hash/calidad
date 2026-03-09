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
import { useUser } from "@/hooks/use-user";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "../ui/skeleton";
import { Separator } from "../ui/separator";
import { cn } from "@/lib/utils";

const DocumentPreviewModal = dynamic(
  () => import('./document-preview-modal').then(mod => mod.DocumentPreviewModal),
  { ssr: false }
);

interface MyDocumentCardProps {
  document: Documento;
  catalogs: Catalogs;
}

export function MyDocumentCard({ document, catalogs }: MyDocumentCardProps) {
  const { user } = useUser();
  const [linkedDocuments, setLinkedDocuments] = useState<Documento[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [docForPreview, setDocForPreview] = useState<Documento | null>(null);

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

  const { ambitoName, caracteristicaName } = useMemo(() => {
    if (!catalogs) return { ambitoName: '', caracteristicaName: '' };
    const ambito = catalogs.ambitos.find(a => a.id === document.ambitoId);
    const caracteristica = catalogs.caracteristicas.find(c => c.id === document.caracteristicaId);
    return {
        ambitoName: ambito?.nombre || 'N/A',
        caracteristicaName: caracteristica?.nombre || 'N/A'
    };
  }, [document.ambitoId, document.caracteristicaId, catalogs]);

  const ambitoClassMap: { [key: string]: string } = {
    "amb-dp": "bg-ambito-dp-bg hover:border-ambito-dp-border-hover",
    "amb-gcl": "bg-ambito-gcl-bg hover:border-ambito-gcl-border-hover",
    "amb-reg": "bg-ambito-reg-bg hover:border-ambito-reg-border-hover",
  };

  const cardColorClasses = ambitoClassMap[document.ambitoId] || "bg-card hover:border-primary/50";


  return (
    <>
      <Card className={cn(
          "flex flex-col transition-shadow duration-300 hover:shadow-xl border border-transparent",
          cardColorClasses
        )}>
        <CardHeader className="pb-3">
            <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">v{document.version}</Badge>
                <Badge variant={statusVariant} className="text-xs">{statusName}</Badge>
            </div>
          <CardTitle className="text-base font-semibold leading-tight line-clamp-2 h-10">
            {document.titulo}
          </CardTitle>
          <CardDescription className="text-xs pt-1">
            {format(document.fechaDocumento, "d 'de' MMMM, yyyy", { locale: es })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow space-y-3 text-sm">
            <div className="h-[60px] space-y-1 text-muted-foreground">
                <div className="flex gap-1">
                    <strong>Ámbito:</strong>
                    <p className="truncate">{ambitoName}</p>
                </div>
                <div className="flex gap-1">
                    <strong>Característica:</strong>
                    <p className="truncate">{caracteristicaName}</p>
                </div>
            </div>
            
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
                            <div key={linkedDoc.id} className="flex items-center justify-between text-xs group">
                                <Link href={`/documentos/${linkedDoc.id}`} className="text-primary hover:underline flex items-center gap-2 overflow-hidden">
                                    <FileText className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0"/>
                                    <span className="truncate">{linkedDoc.titulo}</span>
                                </Link>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 flex-shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDocForPreview(linkedDoc);
                                    }}
                                >
                                    <Eye className="h-3.5 w-3.5" />
                                </Button>
                            </div>
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
          <Button variant="secondary" className="w-full" onClick={() => setDocForPreview(document)}>
            <Eye className="mr-2 h-4 w-4" />
            Vista Rápida
          </Button>
        </CardFooter>
      </Card>
      <DocumentPreviewModal
        isOpen={!!docForPreview}
        onOpenChange={(isOpen) => {
            if (!isOpen) {
            setDocForPreview(null);
            }
        }}
        documento={docForPreview}
      />
    </>
  );
}
