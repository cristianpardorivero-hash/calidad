"use client";

import { UserManager } from "@/components/admin/user-manager";
import { getCatalogs, getUsers } from "@/lib/data";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserProfile, Catalogs } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";


export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (user) {
        setLoading(true);
        const [fetchedUsers, fetchedCatalogs] = await Promise.all([
            getUsers(user.hospitalId),
            getCatalogs(user.hospitalId)
        ]);
        setUsers(fetchedUsers);
        setCatalogs(fetchedCatalogs);
        setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const pageHeader = (
     <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">
            Crea, edita y gestiona los usuarios de tu hospital.
            </p>
        </div>
        <Button asChild>
            <Link href="/admin/usuarios/nuevo">
                <PlusCircle className="mr-2 h-4 w-4"/> Añadir Usuario
            </Link>
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
      <UserManager initialUsers={users} catalogs={catalogs} onUsersChange={fetchData}/>
    </div>
  );
}
