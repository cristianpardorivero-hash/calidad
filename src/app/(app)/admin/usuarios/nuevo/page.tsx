'use client';

import { UserForm } from "@/components/admin/user-form";
import { getCatalogs } from "@/lib/data";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import type { Catalogs } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function NuevoUsuarioPage() {
  const { user } = useAuth();
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.hospitalId) {
      setLoading(true);
      getCatalogs(user.hospitalId)
        .then(data => {
          setCatalogs(data);
          setLoading(false);
        })
        .catch(error => {
          console.error("Failed to fetch catalogs", error);
          setLoading(false);
        });
    }
  }, [user]);

  const pageHeader = (
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight">Crear Nuevo Usuario</h1>
      <p className="text-muted-foreground">
        Complete el formulario para agregar un nuevo usuario al sistema.
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
      <UserForm catalogs={catalogs} />
    </div>
  );
}
