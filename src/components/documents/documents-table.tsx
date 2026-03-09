
"use client";

import * as React from "react";
import type { Catalogs, Documento, UserProfile } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Download,
  Edit,
  Trash2,
  FileText,
  Eye,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { updateDocument } from "@/lib/data";
import { useUser } from "@/hooks/use-user";

const DocumentPreviewModal = dynamic(
  () => import('./document-preview-modal').then(mod => mod.DocumentPreviewModal),
  { ssr: false }
);

const ITEMS_PER_PAGE = 10;

export function DocumentsTable({
  documents,
  catalogs,
  user,
}: {
  documents: Documento[];
  catalogs: Catalogs;
  user: UserProfile;
}) {
  const searchParams = useSearchParams();
  const { firebaseUser } = useUser();
  const currentPage = Number(searchParams.get("page")) || 1;
  const [docToPreview, setDocToPreview] = React.useState<Documento | null>(null);
  const [docToDelete, setDocToDelete] = React.useState<Documento | null>(null);
  const [loadingStates, setLoadingStates] = React.useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const canManage = user.role === 'admin' || user.role === 'editor';

  const handleDeleteConfirm = async () => {
    if (!docToDelete || !firebaseUser) return;
  
    const deletingDoc = docToDelete;
  
    setLoadingStates((prev) => ({ ...prev, [deletingDoc.id]: true }));
  
    try {
      await updateDocument(deletingDoc.id, {
        isDeleted: true,
        deletedAt: new Date(),
        deletedByUid: firebaseUser.uid,
      });
  
      setDocToDelete(null);
  
      toast({
        title: "Documento eliminado",
        description: `El documento "${deletingDoc.titulo}" ha sido eliminado.`,
      });
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el documento.",
      });
    } finally {
      setLoadingStates((prev) => ({
        ...prev,
        [deletingDoc.id]: false,
      }));
    }
  };

  const getCatalogName = (
    catalog: keyof Catalogs,
    id: string | undefined
  ) => {
    if (!id) return "N/A";
    const items = catalogs[catalog] as { id: string; nombre: string }[];
    return items.find((item) => item.id === id)?.nombre || "Desconocido";
  };

  const filteredDocuments = React.useMemo(() => {
    const query = searchParams.get("query");
    const ambitoId = searchParams.get("ambitoId");
    const caracteristicaId = searchParams.get("caracteristicaId");
    const elementoMedibleId = searchParams.get("elementoMedibleId");
    const tipoDocumentoId = searchParams.get("tipoDocumentoId");
    const estadoDocId = searchParams.get("estadoDocId");
    const servicioId = searchParams.get("servicioId");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    return documents.filter((doc) => {
      const from = fromParam ? new Date(fromParam) : null;
      const to = toParam ? new Date(toParam) : null;

      if (query) {
        const lowerQuery = query.toLowerCase();
        if (!doc.searchKeywords?.some(keyword => keyword.includes(lowerQuery))) {
            return false;
        }
      }

      if (ambitoId && doc.ambitoId !== ambitoId) return false;
      if (caracteristicaId && doc.caracteristicaId !== caracteristicaId) return false;
      if (elementoMedibleId && doc.elementoMedibleId !== elementoMedibleId) return false;
      if (tipoDocumentoId && doc.tipoDocumentoId !== tipoDocumentoId) return false;
      if (estadoDocId && doc.estadoDocId !== estadoDocId) return false;
      if (servicioId && (!doc.servicioIds || !doc.servicioIds.includes(servicioId))) return false;

      if (from && doc.fechaDocumento < from) return false;
      if (to && doc.fechaDocumento > to) return false;

      return true;
    });
  }, [documents, searchParams]);

  const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(pageNumber));
    return `?${params.toString()}`;
  };

  const renderPagination = () => {
    const pageNumbers = [];
    // Always show first page
    pageNumbers.push(1);

    // Ellipsis if needed
    if (currentPage > 3) {
      pageNumbers.push(-1); // Use -1 as a marker for ellipsis
    }

    // Pages around current
    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
      if (i > 1 && i < totalPages) {
        pageNumbers.push(i);
      }
    }
    
    // Ellipsis if needed
    if (currentPage < totalPages - 2) {
      pageNumbers.push(-1);
    }

    // Always show last page
    if (totalPages > 1) {
      pageNumbers.push(totalPages);
    }
    
    const uniquePageNumbers = [...new Set(pageNumbers)];

    return uniquePageNumbers.map((page, index) =>
      page === -1 ? (
        <PaginationItem key={`ellipsis-${index}`}>
          <PaginationEllipsis />
        </PaginationItem>
      ) : (
        <PaginationItem key={page}>
          <PaginationLink href={createPageURL(page)} isActive={currentPage === page}>
            {page}
          </PaginationLink>
        </PaginationItem>
      )
    );
  };

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead className="hidden lg:table-cell">Ámbito</TableHead>
              <TableHead className="hidden md:table-cell">Responsable</TableHead>
              <TableHead className="hidden md:table-cell">Versión</TableHead>
              <TableHead className="hidden sm:table-cell">Estado</TableHead>
              <TableHead className="hidden lg:table-cell">Últ. Actualización</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedDocuments.length > 0 ? (
              paginatedDocuments.map((doc) => {
                const isExpired = doc.estadoDocId === 'est-vig' && doc.fechaVigenciaHasta && doc.fechaVigenciaHasta < new Date();
                const statusName = isExpired ? 'Vencido' : getCatalogName("estadosAcreditacionDoc", doc.estadoDocId);
                
                let statusVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
                if (isExpired) {
                    statusVariant = 'destructive';
                } else {
                    switch (doc.estadoDocId) {
                        case 'est-vig': statusVariant = 'default'; break;
                        case 'est-rev': statusVariant = 'secondary'; break;
                        case 'est-obs': statusVariant = 'destructive'; break;
                        case 'est-sus': statusVariant = 'outline'; break;
                        default: statusVariant = 'secondary';
                    }
                }

                return (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div className="flex flex-col">
                              <Link href={`/documentos/${doc.id}`} className="hover:underline font-semibold max-w-[200px] sm:max-w-[300px] truncate">
                                  {doc.titulo}
                              </Link>
                              <span className="text-xs text-muted-foreground">{getCatalogName("tiposDocumento", doc.tipoDocumentoId)}</span>
                          </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell truncate max-w-[150px]">
                      {getCatalogName("ambitos", doc.ambitoId)}
                    </TableCell>
                     <TableCell className="hidden md:table-cell">{doc.responsableNombre}</TableCell>
                     <TableCell className="hidden md:table-cell"><Badge variant="outline">v{doc.version}</Badge></TableCell>
                     <TableCell className="hidden sm:table-cell">
                      <Badge variant={statusVariant}>
                        {statusName}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {doc.updatedAt
                        ? formatDistanceToNow(doc.updatedAt, {
                            addSuffix: true,
                            locale: es,
                          })
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {loadingStates[doc.id] ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      ) : (
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setDocToPreview(doc)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={doc.downloadUrl} download={doc.fileName}>
                                <Download className="mr-2 h-4 w-4" />
                                Descargar
                              </a>
                            </DropdownMenuItem>
                            {canManage && (
                              <>
                                <DropdownMenuItem asChild>
                                  <Link href={`/documentos/${doc.id}/editar`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    setDocToDelete(doc);
                                  }}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No se encontraron documentos con los filtros aplicados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href={createPageURL(currentPage - 1)} disabled={currentPage === 1}/>
            </PaginationItem>
            {renderPagination()}
            <PaginationItem>
              <PaginationNext href={createPageURL(currentPage + 1)} disabled={currentPage === totalPages}/>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
      <DocumentPreviewModal
        documento={docToPreview}
        isOpen={!!docToPreview}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDocToPreview(null);
          }
        }}
      />
      <AlertDialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro de que deseas eliminar este documento?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción marcará al documento como eliminado y no podrá ser accedido. No se borrará permanentemente y podrá ser recuperado por un administrador.
                    <br/><br/>
                    Documento: <strong>"{docToDelete?.titulo}"</strong>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
