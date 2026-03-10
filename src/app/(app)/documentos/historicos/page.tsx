'use client';

import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { collection, query, where, Timestamp, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/firebase/client";
import type { Catalogs, Documento, DocumentVersion } from "@/lib/types";
import { getCatalogs } from "@/lib/data";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentsTable } from "@/components/documents/documents-table";

// Helper functions to safely convert timestamps to dates
const safeToDate = (timestamp: any): Date | undefined => {
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    return undefined;
};

const safeToDateRequired = (timestamp: any, fallbackDate = new Date()): Date => {
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    return fallbackDate;
};


export default function DocumentosHistoricosPage() {
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

        async function fetchHistoricalData() {
            setLoading(true);

            try {
                const catalogsData = await getCatalogs(hospitalId);
                setCatalogs(catalogsData);

                // 1. Get documents from the main collection marked as 'histórico'
                const mainDocsRef = collection(db, "documents");
                const historicalQuery = query(
                    mainDocsRef,
                    where("hospitalId", "==", hospitalId),
                    where("isDeleted", "==", false),
                    where("estadoDocId", "==", "est-hist")
                );

                // 2. Get all archived versions from the versions collection
                const versionsRef = collection(db, "document_versions");
                const versionsQuery = query(
                    versionsRef,
                    where("hospitalId", "==", hospitalId),
                    orderBy("createdAt", "desc")
                );
                
                const [historicalSnapshot, versionsSnapshot] = await Promise.all([
                    getDocs(historicalQuery),
                    getDocs(versionsQuery)
                ]);

                const historicalDocs: Documento[] = historicalSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        fechaDocumento: safeToDateRequired(data.fechaDocumento),
                        fechaVigenciaDesde: safeToDate(data.fechaVigenciaDesde),
                        fechaVigenciaHasta: safeToDate(data.fechaVigenciaHasta),
                        createdAt: safeToDateRequired(data.createdAt),
                        updatedAt: safeToDateRequired(data.updatedAt),
                    } as Documento;
                });

                const substitutedDocs: Documento[] = versionsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    // Map DocumentVersion to a Documento-like object for table display
                    return {
                        ...data,
                        id: doc.id, // The unique ID of the version entry
                        createdAt: safeToDateRequired(data.createdAt),
                        updatedAt: safeToDateRequired(data.updatedAt, safeToDateRequired(data.createdAt)),
                        fechaDocumento: safeToDateRequired(data.fechaDocumento),
                        fechaVigenciaDesde: safeToDate(data.fechaVigenciaDesde),
                        fechaVigenciaHasta: safeToDate(data.fechaVigenciaHasta),
                        isDeleted: false,
                        estadoDocId: data.estadoDocId || 'est-hist', // Ensure historical status for display
                    } as Documento;
                });

                const allHistoricalDocs = [...historicalDocs, ...substitutedDocs];
                
                // Safe sort by last update time
                allHistoricalDocs.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));

                setDocuments(allHistoricalDocs);

            } catch (error) {
                console.error("Error fetching historical documents:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchHistoricalData();
    }, [hospitalId]);

    const pageHeader = (
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Historial de Documentos</h1>
                <p className="text-muted-foreground">
                    Documentos que han sido sustituidos o marcados como históricos.
                </p>
            </div>
        </div>
    );

    if (loading || !catalogs || !user) {
        return (
            <div className="space-y-8">
                {pageHeader}
                <Skeleton className="h-[400px] w-full" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {pageHeader}
            <DocumentsTable
                documents={documents}
                catalogs={catalogs}
                user={user}
            />
        </div>
    );
}
