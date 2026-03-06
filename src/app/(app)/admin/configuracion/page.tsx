'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function ConfiguracionPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parámetros</h1>
          <p className="text-muted-foreground">
            Configura los parámetros generales de la aplicación.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Página en Construcción</CardTitle>
          <CardDescription>
            Esta sección estará disponible próximamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center p-12 bg-muted/50 rounded-b-lg">
            <Settings className="h-16 w-16 text-muted-foreground" />
            <p className="mt-4 font-semibold">Configuración del Sistema</p>
        </CardContent>
      </Card>
    </div>
  );
}
