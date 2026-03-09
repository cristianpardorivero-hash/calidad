'use client';

import { useTheme } from 'next-themes';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Sun, Moon, Laptop } from 'lucide-react';

export default function AjustesPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground">
          Personaliza la apariencia de la aplicación.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tema de la Aplicación</CardTitle>
          <CardDescription>
            Selecciona el tema que prefieras para la interfaz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Label htmlFor="light" className="p-4 rounded-lg border flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary [&:has([data-state=checked])]:border-primary transition-all">
              <Sun className="h-8 w-8"/>
              <span>Claro</span>
              <RadioGroupItem value="light" id="light" className="sr-only" />
            </Label>
            <Label htmlFor="dark" className="p-4 rounded-lg border flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary [&:has([data-state=checked])]:border-primary transition-all">
              <Moon className="h-8 w-8"/>
              <span>Oscuro</span>
              <RadioGroupItem value="dark" id="dark" className="sr-only" />
            </Label>
            <Label htmlFor="system" className="p-4 rounded-lg border flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary [&:has([data-state=checked])]:border-primary transition-all">
              <Laptop className="h-8 w-8"/>
              <span>Sistema</span>
              <RadioGroupItem value="system" id="system" className="sr-only" />
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}
