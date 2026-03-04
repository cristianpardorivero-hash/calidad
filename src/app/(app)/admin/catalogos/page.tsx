import { CatalogManager } from "@/components/admin/catalog-manager";
import { getCatalogs } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default async function AdminCatalogsPage() {
    const hospitalId = "hcurepto";
    const catalogs = await getCatalogs(hospitalId);

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Catálogos</h1>
                    <p className="text-muted-foreground">
                        Administra las opciones de clasificación para los documentos.
                    </p>
                </div>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4"/> Añadir Nuevo
                </Button>
            </div>
            <CatalogManager catalogs={catalogs} />
        </div>
    );
}
