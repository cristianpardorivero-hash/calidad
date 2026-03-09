'use client';

import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { collection, query, where, Timestamp, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/firebase/client";
import type { Catalogs, Documento, DocumentVersion } from "@/lib/types";
import { getCatalogs } from "@/lib/data";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentsTable } from "@/components/documents/documents-table";

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
                        fechaDocumento: (data.fechaDocumento as Timestamp)?.toDate(),
                        fechaVigenciaDesde: data.fechaVigenciaDesde ? (data.fechaVigenciaDesde as Timestamp).toDate() : undefined,
                        fechaVigenciaHasta: data.fechaVigenciaHasta ? (data.fechaVigenciaHasta as Timestamp).toDate() : undefined,
                        createdAt: (data.createdAt as Timestamp)?.toDate(),
                        updatedAt: (data.updatedAt as Timestamp)?.toDate(),
                    } as Documento;
                });

                const substitutedDocs: Documento[] = versionsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    // Map DocumentVersion to a Documento object for table display
                    return {
                        ...data,
                        id: doc.id, // The unique ID of the version entry
                        // Convert all timestamp fields to Date objects
                        createdAt: (data.createdAt as Timestamp)?.toDate(),
                        updatedAt: (data.updatedAt as Timestamp)?.toDate() || (data.createdAt as Timestamp)?.toDate(), // Fallback to createdAt
                        fechaDocumento: (data.fechaDocumento as Timestamp)?.toDate(),
                        fechaVigenciaDesde: data.fechaVigenciaDesde ? (data.fechaVigenciaDesde as Timestamp).toDate() : undefined,
                        fechaVigenciaHasta: data.fechaVigenciaHasta ? (data.fechaVigenciaHasta as Timestamp).toDate() : undefined,
                        isDeleted: false,
                    } as Documento;
                });

                const allHistoricalDocs = [...historicalDocs, ...substitutedDocs];
                // Safe sort
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
