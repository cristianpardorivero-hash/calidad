import { LoginForm } from "@/components/auth/login-form";
import { File } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex items-center gap-2 text-primary">
                <File className="h-8 w-8"/>
                <h1 className="text-3xl font-bold text-foreground">
                    AcreditaDoc Pro
                </h1>
            </div>
            <p className="text-muted-foreground">
                Bienvenido de vuelta. Inicia sesión para gestionar tus documentos.
            </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
