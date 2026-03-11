
'use client';

import { LoginForm } from "@/components/auth/login-form";
import { File } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
    const { user, loading: authLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && user) {
            router.push('/mis-documentos');
        }
    }, [user, authLoading, router]);

    if (authLoading || user) {
        return <div className="h-screen w-full bg-background" />;
    }

    return (
        <div className="h-screen w-full lg:grid lg:grid-cols-2">
            <div className="hidden lg:flex flex-col items-center justify-center bg-sidebar text-sidebar-foreground p-10">
                <div className="flex items-center gap-4">
                    <File className="h-12 w-12 text-sidebar-primary" />
                    <h1 className="text-5xl font-bold">
                        AcreditaDoc Pro
                    </h1>
                </div>
                <p className="mt-4 max-w-md text-center text-lg text-muted-foreground">
                    La plataforma de gestion de documentos de calidad y seguridad del paciente del Hospital de Curepto
                </p>
            </div>
            <div className="flex items-center justify-center bg-background p-4">
                <div className="w-full max-w-md">
                    <div className="mb-8 flex flex-col items-center text-center lg:hidden">
                        <div className="mb-4 flex items-center gap-2 text-primary">
                            <File className="h-8 w-8"/>
                            <h1 className="text-3xl font-bold text-foreground">
                                AcreditaDoc Pro
                            </h1>
                        </div>
                    </div>
                    <LoginForm />
                </div>
            </div>
        </div>
    );
}
