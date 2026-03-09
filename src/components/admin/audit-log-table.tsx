'use client';

import type { AuditLog } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, FileText } from "lucide-react";
import Link from "next/link";

const actionLabels: { [key: string]: string } = {
  UPLOAD: "Subida",
  UPDATE_META: "Actualización",
  DELETE: "Eliminación",
  LOGIN: "Inicio Sesión",
  CHANGE_ROLE: "Cambio de Rol",
  DOWNLOAD: "Descarga",
  RESTORE: "Restauración"
};

const getActionBadgeVariant = (action: string): BadgeProps['variant'] => {
    switch(action) {
        case 'UPLOAD':
        case 'LOGIN':
        case 'RESTORE':
            return 'default';
        case 'DELETE':
            return 'destructive';
        case 'UPDATE_META':
        case 'DOWNLOAD':
        case 'CHANGE_ROLE':
            return 'secondary';
        default:
            return 'outline';
    }
}

export function AuditLogTable({ logs }: { logs: AuditLog[] }) {

    const renderDetails = (details: Record<string, any> | string[]) => {
        const detailString = JSON.stringify(details, null, 2);
        if (detailString.length < 50 && !detailString.includes('\n')) {
            return <pre className="text-xs font-mono">{detailString}</pre>;
        }
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                            <Info className="h-3 w-3" /> Ver detalles
                        </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md bg-popover text-popover-foreground border shadow-lg rounded-md">
                        <pre className="text-xs font-mono bg-transparent p-2 rounded-md max-h-64 overflow-auto">{detailString}</pre>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Acción</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead className="hidden md:table-cell">Recurso Afectado</TableHead>
            <TableHead className="hidden lg:table-cell">Detalles</TableHead>
            <TableHead className="text-right">Fecha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length > 0 ? (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <Badge variant={getActionBadgeVariant(log.action)} className="capitalize">
                    {actionLabels[log.action] || log.action}
                  </Badge>
                </TableCell>
                <TableCell>
                    <div className="flex flex-col">
                        <span className="font-medium">{log.actorEmail}</span>
                        <span className="text-xs text-muted-foreground font-mono">{log.actorUid}</span>
                    </div>
                </TableCell>
                <TableCell className="hidden md:table-cell font-mono text-xs">
                    {log.docId ? (
                        <Link href={`/documentos/${log.docId}`} className="flex items-center gap-2 hover:underline text-primary">
                            <FileText className="h-3 w-3" /> {log.docId}
                        </Link>
                    ) : 'N/A'}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                    {log.details ? renderDetails(log.details) : 'N/A'}
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-xs">
                    {log.timestamp ? formatDistanceToNow(log.timestamp, { addSuffix: true, locale: es }) : 'N/A'}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No hay registros de auditoría disponibles.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
