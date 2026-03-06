
"use client";

import { UserManager } from "@/components/admin/user-manager";
import { getCatalogs } from "@/lib/data";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserProfile, Catalogs } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [loading, setLoading] = useState(true);
  
  const hospitalId = user?.hospitalId;

  useEffect(() => {
    let unsubscribe = () => {};

    if (hospitalId) {
        setLoading(true);

        const usersRef = collection(db, "users");
        const q = query(
          usersRef,
          where("hospitalId", "==", hospitalId),
          where("isDeleted", "==", false)
        );
        
        unsubscribe = onSnapshot(q, (snapshot) => {
          const fetchedUsers = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                ...data,
                uid: doc.id,
                createdAt: (data.createdAt as Timestamp)?.toDate(),
                updatedAt: (data.updatedAt as Timestamp)?.toDate(),
            } as UserProfile;
          });
          setUsers(fetchedUsers);
          setLoading(false);
        }, (error) => {
            console.error("Error listening to users:", error);
            setLoading(false);
        });

        getCatalogs(hospitalId).then(setCatalogs);

    } else if (!user) {
        setLoading(false);
    }
    
    return () => unsubscribe();
  }, [hospitalId]);

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
      <UserManager initialUsers={users} catalogs={catalogs} />
    </div>
  );
}
