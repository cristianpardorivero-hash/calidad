
'use client';

import { useUser } from '@/hooks/use-user';
import { getCatalogs } from '@/lib/data';
import { useEffect, useState } from 'react';
import type { Catalogs } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { User as UserIcon, Building, Shield, Mail, Briefcase } from 'lucide-react';

export default function PerfilPage() {
  const { user, loading: userLoading } = useUser();
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);

  useEffect(() => {
    if (user?.hospitalId) {
      setLoadingCatalogs(true);
      getCatalogs(user.hospitalId)
        .then(setCatalogs)
        .finally(() => setLoadingCatalogs(false));
    }
  }, [user?.hospitalId]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getServicioNames = (servicioIds: string[] | undefined) => {
    if (!catalogs || !servicioIds || servicioIds.length === 0) {
      return ['No asignado'];
    }
    return servicioIds.map(
      (id) => catalogs.servicios.find((s) => s.id === id)?.nombre || 'Desconocido'
    );
  };
  
  const getRoleDisplayName = (role: string) => {
    switch (role) {
        case 'admin': return 'Administrador';
        case 'editor': return 'Editor';
        case 'lector': return 'Lector';
        default: return role;
    }
  }

  const isLoading = userLoading || loadingCatalogs;

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
        <div className="space-y-8">
          <Skeleton className="h-9 w-1/3" />
          <Card>
            <CardHeader className="flex flex-col items-center pb-6 text-center">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="mt-4 space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-5 w-64" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
                <div className="space-y-4">
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-2/3" />
                </div>
                 <div className="space-y-4">
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-5 w-full" />
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
        <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 text-center">
            <h1 className="text-2xl font-bold">Usuario no encontrado</h1>
            <p className="text-muted-foreground">No pudimos cargar tu información de perfil.</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <div className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>

        <Card>
          <CardHeader className="flex flex-col items-center pb-6 text-center">
            <Avatar className="h-24 w-24 border-4 border-background shadow-md">
              <AvatarImage
                src={`https://picsum.photos/seed/${user.uid}/100/100`}
                alt={user.displayName}
              />
              <AvatarFallback className="text-3xl">
                {getInitials(user.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="mt-4">
                <CardTitle className="text-2xl">{user.displayName}</CardTitle>
                <CardDescription className="text-base">{user.email}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">

            <div className="space-y-3">
                <h3 className="flex items-center text-lg font-semibold"><UserIcon className="mr-3 h-5 w-5 text-primary"/> Información General</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Rol en el sistema</p>
                            <p className="font-semibold">{getRoleDisplayName(user.role)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Building className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Hospital</p>
                            <p className="font-semibold">{user.hospitalId}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                 <h3 className="flex items-center text-lg font-semibold"><Briefcase className="mr-3 h-5 w-5 text-primary"/> Servicios Asignados</h3>
                 <div className="rounded-lg border p-4">
                    <div className="flex flex-wrap gap-2">
                    {getServicioNames(user.servicioIds).map((name) => (
                        <Badge key={name} variant="secondary" className="text-sm">
                        {name}
                        </Badge>
                    ))}
                    </div>
                 </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
