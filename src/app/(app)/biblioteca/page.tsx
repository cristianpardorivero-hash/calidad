'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/hooks/use-user';
import type { LibraryDocument } from '@/lib/types';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Library, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { LibraryCard } from '@/components/biblioteca/library-card';

export default function BibliotecaPage() {
  const { user } = useUser();
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const hospitalId = user?.hospitalId;

  useEffect(() => {
    if (!hospitalId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const docsRef = collection(db, 'library_documents');
    const q = query(
      docsRef,
      where('hospitalId', '==', hospitalId),
      where('isDeleted', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedDocs = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as LibraryDocument;
      });
      setDocuments(fetchedDocs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching library documents:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [hospitalId]);

  const canManage = user?.role === 'admin' || user?.role === 'editor';

  const pageHeader = (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Biblioteca</h1>
        <p className="text-muted-foreground">
          Recursos, manuales y documentos generales del hospital.
        </p>
      </div>
      {canManage && (
        <Button asChild>
          <Link href="/biblioteca/nuevo">
            <PlusCircle className="mr-2 h-4 w-4" /> Subir Documento
          </Link>
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {pageHeader}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : documents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {documents.map((doc) => (
            <LibraryCard key={doc.id} document={doc} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-12 bg-muted/50 rounded-lg border-2 border-dashed">
            <Library className="h-16 w-16 text-muted-foreground" />
            <p className="mt-4 font-semibold text-lg">La biblioteca está vacía</p>
            <p className="text-muted-foreground mt-1">
              {canManage ? "Comienza subiendo el primer documento." : "No hay documentos disponibles en este momento."}
            </p>
        </div>
      )}
    </div>
  );
}
