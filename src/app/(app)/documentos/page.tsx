import { DocumentsTable } from "@/components/documents/documents-table";
import { getCatalogs, getDocuments } from "@/lib/data";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DocumentsFilters } from "@/components/documents/documents-filters";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const hospitalId = "hcurepto"; // Mocked
  const [documents, catalogs] = await Promise.all([
    getDocuments(hospitalId),
    getCatalogs(hospitalId),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Explorador de Documentos
          </h1>
          <p className="text-muted-foreground">
            Busca, filtra y gestiona todos los documentos de acreditación.
          </p>
        </div>
        <Button asChild>
          <Link href="/documentos/nuevo">
            <PlusCircle className="mr-2 h-4 w-4" /> Subir Documento
          </Link>
        </Button>
      </div>

      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <DocumentsFilters catalogs={catalogs} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <DocumentsTable documents={documents} searchParams={searchParams} catalogs={catalogs} />
      </Suspense>
    </div>
  );
}
