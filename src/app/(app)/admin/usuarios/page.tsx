
"use client";

import { UserManager } from "@/components/admin/user-manager";
import { getCatalogs, getUsers } from "@/lib/data";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserProfile, Catalogs } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";


export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDataChange = useCallback(() => {
    setRefreshTrigger(t => t + 1);
  }, []);

  const hospitalId = user?.hospitalId;

  useEffect(() => {
    const fetchData = async () => {
      if (hospitalId) {
          setLoading(true);
          const [fetchedUsers, fetchedCatalogs] = await Promise.all([
              getUsers(hospitalId),
              getCatalogs(hospitalId)
          ]);
          setUsers(fetchedUsers);
          setCatalogs(fetchedCatalogs);
          setLoading(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalId, refreshTrigger]);

  const pageHeader = (
     <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">
            Crea, edita y gestiona los usuarios de tu hospital.
            </p>
        </div>
        <Button onClick={() => router.push('/admin/usuarios/nuevo')}>
            <PlusCircle className="mr-2 h-4 w-4"/> Añadir Usuario
        </Button>
      </div>
  );
  
  if (loading || !catalogs) {
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
      <UserManager initialUsers={users} catalogs={catalogs} onUsersChange={handleDataChange}/>
    </div>
  );
}
