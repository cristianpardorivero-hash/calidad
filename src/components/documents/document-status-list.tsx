'use client';

import type { Documento, Catalogs } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DocumentStatusListProps {
    title: string;
    description: string;
    documents: Documento[];
    catalogs: Catalogs;
}

export function DocumentStatusList({ title, description, documents, catalogs }: DocumentStatusListProps) {

    const getCatalogName = (
        catalog: keyof Catalogs,
        id: string | undefined
      ) => {
        if (!id) return "N/A";
        const items = catalogs[catalog] as { id: string; nombre: string }[];
        return items.find((item) => item.id === id)?.nombre || "Desconocido";
      };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Documento</TableHead>
                                <TableHead className="text-right">Fecha de Vencimiento</TableHead>
                                <TableHead><span className="sr-only">Acciones</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.length > 0 ? (
                                documents.map((doc) => (
                                    <TableRow key={doc.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <Link href={`/documentos/${doc.id}`} className="font-semibold hover:underline">
                                                    {doc.titulo}
                                                </Link>
                                                <span className="text-xs text-muted-foreground">
                                                    {getCatalogName("tiposDocumento", doc.tipoDocumentoId)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {doc.fechaVigenciaHasta ? (
                                                <Badge variant="destructive">
                                                    {format(doc.fechaVigenciaHasta, "d 'de' MMMM, yyyy", { locale: es })}
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">No especificada</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" asChild>
                                                <Link href={`/documentos/${doc.id}`}>
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        No hay documentos en esta categoría.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
