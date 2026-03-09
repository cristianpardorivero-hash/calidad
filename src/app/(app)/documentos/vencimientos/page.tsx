'use client';

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { onSnapshot, collection, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/client";
import type { Catalogs, Documento } from "@/lib/types";
import { getCatalogs } from "@/lib/data";
import { Skeleton } from "@/components/ui/skeleton";
import { FileClock } from "lucide-react";
import { DocumentStatusList } from "@/components/documents/document-status-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function VencimientosPage() {
    const { user } = useUser();
    const [documents, setDocuments] = useState<Documento[]>([]);
    const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
    const [loading, setLoading] = useState(true);
    const hospitalId = user?.hospitalId;

    useEffect(() => {
        if (!hospitalId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const docsRef = collection(db, "documents");
        const q = query(
            docsRef,
            where("hospitalId", "==", hospitalId),
            where("isDeleted", "==", false),
            where("fechaVigenciaHasta", "!=", null) // Only fetch docs that have an expiration date
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedDocs = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    fechaDocumento: (data.fechaDocumento as Timestamp)?.toDate(),
                    fechaVigenciaDesde: (data.fechaVigenciaDesde as Timestamp)?.toDate(),
                    fechaVigenciaHasta: (data.fechaVigenciaHasta as Timestamp)?.toDate(),
                    createdAt: (data.createdAt as Timestamp)?.toDate(),
                    updatedAt: (data.updatedAt as Timestamp)?.toDate(),
                } as Documento;
            });
            setDocuments(fetchedDocs);
        }, (error) => {
            console.error("Error listening to documents:", error);
            setLoading(false);
        });
        
        getCatalogs(hospitalId).then(data => {
            setCatalogs(data);
            setLoading(false);
        }).catch(error => {
            console.error("Failed to fetch catalogs:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [hospitalId]);

    const { expired, expiringSoon } = useMemo(() => {
        const now = new Date();
        const ninetyDaysFromNow = new Date();
        ninetyDaysFromNow.setDate(now.getDate() + 90);
        
        const expired: Documento[] = [];
        const expiringSoon: Documento[] = [];

        for (const doc of documents) {
            if (doc.fechaVigenciaHasta) {
                if (doc.fechaVigenciaHasta < now) {
                    expired.push(doc);
                } else if (doc.fechaVigenciaHasta <= ninetyDaysFromNow) {
                    expiringSoon.push(doc);
                }
            }
        }
        
        // Sort by expiration date, oldest first for expired, nearest first for expiring soon
        expired.sort((a, b) => a.fechaVigenciaHasta!.getTime() - b.fechaVigenciaHasta!.getTime());
        expiringSoon.sort((a, b) => a.fechaVigenciaHasta!.getTime() - b.fechaVigenciaHasta!.getTime());

        return { expired, expiringSoon };
    }, [documents]);

    const pageHeader = (
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Control de Vencimientos</h1>
                <p className="text-muted-foreground">
                    Monitoriza los documentos que han vencido o están por vencer.
                </p>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="space-y-8">
                {pageHeader}
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }
    
    if (!catalogs) {
        return (
            <div className="space-y-8">
                {pageHeader}
                 <Alert variant="destructive">
                    <FileClock className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>No se pudieron cargar los datos de catálogos necesarios para esta página.</AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {pageHeader}
            <DocumentStatusList 
                title="Documentos Vencidos"
                description="Estos documentos ya han superado su fecha de vigencia."
                documents={expired}
                catalogs={catalogs}
            />
            <DocumentStatusList 
                title="Próximos a Vencer"
                description="Estos documentos perderán su vigencia dentro de los próximos 90 días."
                documents={expiringSoon}
                catalogs={catalogs}
            />
        </div>
    );
}
