
"use client";

import { CatalogManager } from "@/components/admin/catalog-manager";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Catalogs } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminCatalogsPage() {
    const { user } = useAuth();
    const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
    const [loading, setLoading] = useState(true);

    const hospitalId = user?.hospitalId;
    
    useEffect(() => {
        if (!hospitalId) {
            setLoading(false);
            return;
        }
        setLoading(true);

        const catalogNames: (keyof Catalogs)[] = [
          "ambitos", "caracteristicas", "elementosMedibles",
          "tiposDocumento", "servicios", "estadosAcreditacionDoc",
        ];

        const unsubscribes = catalogNames.map(name => {
            const collRef = collection(db, "catalogs", hospitalId, name);
            return onSnapshot(collRef, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCatalogs(prev => ({
                    ...(prev || { ambitos: [], caracteristicas: [], elementosMedibles: [], tiposDocumento: [], servicios: [], estadosAcreditacionDoc: [] }),
                    [name]: data
                }));
                setLoading(false); 
            }, error => {
                console.error(`Error listening to ${name}:`, error);
                setLoading(false);
            });
        });

        return () => unsubscribes.forEach(unsub => unsub());
    }, [hospitalId]);

    const pageHeader = (
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Gestión de Catálogos</h1>
                <p className="text-muted-foreground">
                    Administra las opciones de clasificación para los documentos.
                </p>
            </div>
            <Button asChild>
                <Link href="/admin/catalogos/nuevo">
                    <PlusCircle className="mr-2 h-4 w-4"/> Añadir Nuevo
                </Link>
            </Button>
        </div>
    );

    if (loading || !catalogs) {
        return (
            <div className="space-y-8">
                {pageHeader}
                <Skeleton className="h-[500px] w-full" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {pageHeader}
            <CatalogManager catalogs={catalogs} />
        </div>
    );
}
