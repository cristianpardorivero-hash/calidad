'use client';

import { LibraryDocumentForm } from "@/components/biblioteca/library-document-form";

export default function NuevaBibliotecaPage() {
  
  const pageHeader = (
    <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Subir a la Biblioteca</h1>
        <p className="text-muted-foreground">
          Añade un nuevo recurso general al repositorio del hospital.
        </p>
    </div>
  );

  return (
    <div className="container mx-auto max-w-2xl">
      {pageHeader}
      <LibraryDocumentForm />
    </div>
  );
}
