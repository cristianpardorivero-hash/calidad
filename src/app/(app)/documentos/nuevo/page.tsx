import { DocumentForm } from "@/components/documents/document-form";
import { getCatalogs } from "@/lib/data";

export default async function NuevoDocumentoPage() {
  const hospitalId = "hcurepto"; // Mocked
  const catalogs = await getCatalogs(hospitalId);

  return (
    <div className="container mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Subir Nuevo Documento</h1>
        <p className="text-muted-foreground">
          Complete el formulario para agregar un nuevo documento al sistema.
        </p>
      </div>
      <DocumentForm catalogs={catalogs} />
    </div>
  );
}
