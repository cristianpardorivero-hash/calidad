'use client';

import { CatalogForm } from "@/components/admin/catalog-form";
import { getCatalogs } from "@/lib/data";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import type { Catalogs } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function NuevoCatalogoPage() {
  const { user } = useAuth();
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [loading, setLoading] = useState(true);
  const hospitalId = user?.hospitalId;

  useEffect(() => {
    if (hospitalId) {
      setLoading(true);
      getCatalogs(hospitalId)
        .then(data => {
          setCatalogs(data);
          setLoading(false);
        })
        .catch(error => {
          console.error("Failed to fetch catalogs", error);
          setLoading(false);
        });
    }
  }, [hospitalId]);

  const pageHeader = (
    <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Crear Nuevo Ítem de Catálogo</h1>
        <p className="text-muted-foreground">
          Seleccione el tipo de catálogo y complete el formulario.
        </p>
    </div>
  );

  if (loading || !catalogs) {
    return (
        <div className="container mx-auto max-w-2xl">
            {pageHeader}
            <div className="space-y-6 py-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl">
      {pageHeader}
      <CatalogForm catalogs={catalogs} />
    </div>
  );
}
