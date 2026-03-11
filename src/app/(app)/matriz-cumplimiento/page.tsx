'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser } from '@/hooks/use-user';
import type { Catalogs, Documento, UserRole } from '@/lib/types';
import { getCatalogs, getDocuments } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { ComplianceMatrix } from '@/components/matriz/compliance-matrix';

export default function MatrizCumplimientoPage() {
  const { user } = useUser();
  const hospitalId = user?.hospitalId;
  const userRole = user?.role as UserRole | undefined;
  
  const servicioIds = useMemo(() => user?.servicioIds, [user?.servicioIds]);

  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hospitalId) {
      setLoading(true);
      Promise.all([
        getCatalogs(hospitalId),
        getDocuments(hospitalId, userRole, servicioIds),
      ])
        .then(([catalogsData, documentsData]) => {
          setCatalogs(catalogsData);
          setDocuments(documentsData);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Failed to fetch compliance data:', error);
          setLoading(false);
        });
    } else if (!user) {
        setLoading(false);
    }
  }, [hospitalId, userRole, servicioIds, user]);

  const pageHeader = (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Matriz de Cumplimiento</h1>
      <p className="text-muted-foreground">
        Visualiza el estado de la documentación por característica y tipo de documento.
      </p>
    </div>
  );
  
  if (loading || !catalogs) {
    return (
        <div className="space-y-8">
            {pageHeader}
            <div className="space-y-4">
              <Skeleton className="h-10 w-1/4" />
              <Skeleton className="h-96 w-full" />
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      {pageHeader}
      <ComplianceMatrix documents={documents} catalogs={catalogs} />
    </div>
  );
}
