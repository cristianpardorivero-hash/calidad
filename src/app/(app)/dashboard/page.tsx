'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  FileCheck2,
  FileClock,
  PlusCircle,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getDashboardKPIs } from "@/lib/data";
import {
  ChartConfig,
} from "@/components/ui/chart";
import { DashboardChart } from "@/components/dashboard/dashboard-chart";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

const chartConfig = {
  docs: {
    label: "Documentos",
  },
  "Dignidad del Paciente": {
    label: "Dignidad del Paciente",
    color: "hsl(var(--chart-1))",
  },
  "Gestión Clínica": {
    label: "Gestión Clínica",
    color: "hsl(var(--chart-2))",
  },
  "Registros": {
    label: "Registros",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

type KpiData = {
    totalDocs: number;
    vigentes: number;
    proximosAVencer: number;
    docsPorAmbito: { name: string; value: number; }[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.hospitalId) {
      setLoading(true);
      getDashboardKPIs(user.hospitalId)
        .then(data => {
          setKpis(data);
          setLoading(false);
        })
        .catch(error => {
          console.error("Failed to fetch dashboard KPIs", error);
          setLoading(false);
        });
    }
  }, [user]);

  const pageHeader = (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen general del estado de tus documentos de acreditación.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/documentos">
            <FolderOpen className="mr-2 h-4 w-4" /> Explorar
          </Link>
        </Button>
        <Button asChild>
          <Link href="/documentos/nuevo">
            <PlusCircle className="mr-2 h-4 w-4" /> Subir Documento
          </Link>
        </Button>
      </div>
    </div>
  );

  if (loading || !kpis) {
    return (
        <div className="flex flex-col gap-8">
            {pageHeader}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="h-[120px]"><CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/3" /></CardContent></Card>
                <Card className="h-[120px]"><CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/3" /></CardContent></Card>
                <Card className="h-[120px]"><CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/3" /></CardContent></Card>
            </div>
            <div className="grid grid-cols-1 gap-8">
                <Card><CardHeader><Skeleton className="h-6 w-1/4" /><Skeleton className="h-4 w-2/4" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
            </div>
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {pageHeader}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Documentos Totales
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalDocs}</div>
            <p className="text-xs text-muted-foreground">
              Total de documentos en el sistema
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Documentos Vigentes
            </CardTitle>
            <FileCheck2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.vigentes}</div>
            <p className="text-xs text-muted-foreground">
              Documentos con estado "Vigente"
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Próximos a Vencer
            </CardTitle>
            <FileClock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.proximosAVencer}</div>
            <p className="text-xs text-muted-foreground">
              En los próximos 60 días
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Documentos por Ámbito</CardTitle>
            <CardDescription>
              Distribución de documentos en los principales ámbitos de
              acreditación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardChart data={kpis.docsPorAmbito} chartConfig={chartConfig} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
