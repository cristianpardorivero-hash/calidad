import { CatalogForm } from "@/components/admin/catalog-form";
import { getCatalogs } from "@/lib/data";

export default async function NuevoCatalogoPage() {
  // In a real app, you'd get the user's hospitalId from their session
  const hospitalId = "hcurepto";
  const catalogs = await getCatalogs(hospitalId);

  return (
    <div className="container mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Crear Nuevo Ítem de Catálogo</h1>
        <p className="text-muted-foreground">
          Seleccione el tipo de catálogo y complete el formulario.
        </p>
      </div>
      <CatalogForm catalogs={catalogs} />
    </div>
  );
}
