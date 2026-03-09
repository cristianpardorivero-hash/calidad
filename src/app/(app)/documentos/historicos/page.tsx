'use client';

import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { onSnapshot, collection, query, where, Timestamp, getDocs, orderBy } from "firebase/firestore";
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
                // Fetch catalogs first
                const catalogsData = await getCatalogs(hospitalId);
                setCatalogs(catalogsData);

                // 1. Get latest docs that are 'histórico'
                const docsRef = collection(db, "documents");
                const historicalDocsQuery = query(
                    docsRef,
                    where("hospitalId", "==", hospitalId),
                    where("isDeleted", "==", false),
                    where("estadoDocId", "==", "est-hist")
                );
                const latestHistoricalSnapshot = await getDocs(historicalDocsQuery);
                const latestHistoricalDocs = latestHistoricalSnapshot.docs.map(doc => {
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

                // 2. Get all archived versions (which have status 'sustituido')
                const versionsRef = collection(db, "document_versions");
                const archivedVersionsQuery = query(
                    versionsRef,
                    where("hospitalId", "==", hospitalId),
                    orderBy("createdAt", "desc")
                );
                const archivedVersionsSnapshot = await getDocs(archivedVersionsQuery);
                const archivedDocs = archivedVersionsSnapshot.docs.map(doc => {
                    const data = doc.data() as DocumentVersion;
                    // Map DocumentVersion to a Documento-like object for the table
                    return {
                        ...data,
                        id: data.id, // Use the version's own unique ID for the key
                        updatedAt: (data.createdAt as Timestamp)?.toDate(),
                        isDeleted: false,
                        searchKeywords: [data.titulo.toLowerCase()],
                        // Filler props to satisfy the Documento type for the table
                        createdByEmail: '',
                        mimeType: '',
                    } as Documento;
                });

                // 3. Merge and sort results
                const allDocs = [...latestHistoricalDocs, ...archivedDocs];
                allDocs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

                setDocuments(allDocs);
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
