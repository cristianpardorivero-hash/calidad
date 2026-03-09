'use client';

import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { onSnapshot, collection, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/client";
import type { Catalogs, Documento } from "@/lib/types";
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
        let unsubscribe = () => {};
        if (!hospitalId || !user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const docsRef = collection(db, "documents");
        // Query for documents that are not "Vigente"
        const historicalStatusIds = ["est-rev", "est-sus", "est-obs"];
        const q = query(
            docsRef,
            where("hospitalId", "==", hospitalId),
            where("isDeleted", "==", false),
            where("estadoDocId", "in", historicalStatusIds)
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
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
            setLoading(false);
        }, (error) => {
            console.error("Error listening to historical documents:", error);
            setLoading(false);
        });
        
        getCatalogs(hospitalId).then(setCatalogs);

        return () => unsubscribe();
    }, [hospitalId, user]);

    const pageHeader = (
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Historial de Documentos</h1>
                <p className="text-muted-foreground">
                    Documentos que han sido sustituidos, están en revisión o han quedado obsoletos.
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
