"use client";

import * as React from "react";
import type { Catalogs, Documento } from "@/lib/types";
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

const ITEMS_PER_PAGE = 10;

export function DocumentsTable({
  documents,
  catalogs,
  searchParams,
}: {
  documents: Documento[];
  catalogs: Catalogs;
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const currentPage = Number(searchParams?.page) || 1;

  const getCatalogName = (
    catalog: keyof Catalogs,
    id: string | undefined
  ) => {
    if (!id) return "N/A";
    const items = catalogs[catalog] as { id: string; nombre: string }[];
    return items.find((item) => item.id === id)?.nombre || "Desconocido";
  };

  const filteredDocuments = React.useMemo(() => {
    return documents.filter((doc) => {
      const {
        query,
        ambitoId,
        caracteristicaId,
        puntoVerificacionId,
        elementoMedibleId,
        tipoDocumentoId,
        estadoDocId,
        servicioId,
      } = searchParams || {};

      const from = searchParams?.from ? new Date(searchParams.from as string) : null;
      const to = searchParams?.to ? new Date(searchParams.to as string) : null;

      if (query && typeof query === 'string') {
        const lowerQuery = query.toLowerCase();
        if (
          !doc.titulo.toLowerCase().includes(lowerQuery) &&
          !doc.responsableNombre.toLowerCase().includes(lowerQuery) &&
          !doc.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
        ) {
          return false;
        }
      }

      if (ambitoId && doc.ambitoId !== ambitoId) return false;
      if (caracteristicaId && doc.caracteristicaId !== caracteristicaId) return false;
      if (puntoVerificacionId && doc.puntoVerificacionId !== puntoVerificacionId) return false;
      if (elementoMedibleId && doc.elementoMedibleId !== elementoMedibleId) return false;
      if (tipoDocumentoId && doc.tipoDocumentoId !== tipoDocumentoId) return false;
      if (estadoDocId && doc.estadoDocId !== estadoDocId) return false;
      if (servicioId && doc.servicioId !== servicioId) return false;

      if (from && doc.fechaDocumento < from) return false;
      if (to && doc.fechaDocumento > to) return false;

      return true;
    });
  }, [documents, searchParams, catalogs]);

  const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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
          <PaginationLink href={`?page=${page}`} isActive={currentPage === page}>
            {page}
          </PaginationLink>
        </PaginationItem>
      )
    );
  };
  
  const getStatusVariant = (statusId: string) => {
    switch (statusId) {
        case 'est-vig': return 'default';
        case 'est-rev': return 'secondary';
        case 'est-obs': return 'destructive';
        case 'est-sus': return 'outline';
        default: return 'secondary';
    }
  }

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
              paginatedDocuments.map((doc) => (
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
                    <Badge variant={getStatusVariant(doc.estadoDocId)}>
                      {getCatalogName("estadosAcreditacionDoc", doc.estadoDocId)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {formatDistanceToNow(doc.updatedAt, {
                      addSuffix: true,
                      locale: es,
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link href={doc.downloadUrl} download><Download className="mr-2 h-4 w-4" />Descargar</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href={`/documentos/${doc.id}/editar`}><Edit className="mr-2 h-4 w-4" />Editar</Link></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
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
              <PaginationPrevious href={`?page=${currentPage - 1}`} disabled={currentPage === 1}/>
            </PaginationItem>
            {renderPagination()}
            <PaginationItem>
              <PaginationNext href={`?page=${currentPage + 1}`} disabled={currentPage === totalPages}/>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </>
  );
}
