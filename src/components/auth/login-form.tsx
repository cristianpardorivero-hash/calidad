"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function LoginForm() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      // On success, the AuthContext state will change, and the
      // parent page component (`/login/page.tsx`) will handle the redirect.
    } catch (error: any) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "Error de inicio de sesión",
            description: error.message || "Credenciales incorrectas o error de red.",
        })
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
        <CardDescription>
          Ingresa tus credenciales para acceder a tu panel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form id="login-form" onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button form="login-form" type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            Ingresar
        </Button>
        <p className="text-center text-sm text-muted-foreground">
            ¿Olvidaste tu contraseña?{' '}
            <a href="#" className="underline hover:text-primary">
                Recupérala
            </a>
        </p>
      </CardFooter>
    </Card>
  );
}
