import { UserForm } from "@/components/admin/user-form";
import { getCatalogs } from "@/lib/data";

export default async function NuevoUsuarioPage() {
  // In a real app, you'd get the user's hospitalId from their session
  const hospitalId = "hcurepto";
  const catalogs = await getCatalogs(hospitalId);

  return (
    <div className="container mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Crear Nuevo Usuario</h1>
        <p className="text-muted-foreground">
          Complete el formulario para agregar un nuevo usuario al sistema.
        </p>
      </div>
      <UserForm catalogs={catalogs} />
    </div>
  );
}
