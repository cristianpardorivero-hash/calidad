"use client";

import { CatalogManager } from "@/components/admin/catalog-manager";
import { getCatalogs } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Catalogs } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";


export default function AdminCatalogsPage() {
    const { user } = useAuth();
    const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleDataChange = useCallback(() => {
      setRefreshTrigger(t => t + 1);
    }, []);
    
    useEffect(() => {
        const fetchData = async () => {
            if (user) {
                setLoading(true);
                const fetchedCatalogs = await getCatalogs(user.hospitalId);
                setCatalogs(fetchedCatalogs);
                setLoading(false);
            }
        };
        fetchData();
    }, [user, refreshTrigger]);

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
            <CatalogManager catalogs={catalogs} onCatalogsChange={handleDataChange}/>
        </div>
    );
}
