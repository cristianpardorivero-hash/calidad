'use client';

import { LoginForm } from "@/components/auth/login-form";
import { File } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export default function LoginPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // If auth is done loading and we have a user, redirect to dashboard.
        if (!authLoading && user) {
            router.push('/dashboard');
        }
    }, [user, authLoading, router]);

    // While loading or if user exists (and we're about to redirect), show a loading state.
    if (authLoading || user) {
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
                    {/* Skeleton UI */}
                    <Card>
                        <CardHeader>
                        <Skeleton className="h-8 w-3/5" />
                        <Skeleton className="h-4 w-4/5" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4">
                            <Skeleton className="h-10 w-full" />
                        </CardFooter>
                    </Card>
                </div>
            </div>
        );
    }

    // If not loading and no user, show the login form.
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
