"use client";

import type { Catalogs, UserProfile } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { addUser, updateUser } from "@/lib/data";
import { useAuth } from "@/hooks/use-auth";

const formSchema = z.object({
  displayName: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Correo electrónico inválido."),
  role: z.enum(["admin", "editor", "lector"], { required_error: "Debe seleccionar un rol."}),
  servicioId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface UserFormProps {
  user?: UserProfile;
  catalogs: Catalogs;
  onSave?: () => void;
  onCancel?: () => void;
}

export function UserForm({ user, catalogs, onSave, onCancel }: UserFormProps) {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!user;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      email: user?.email || "",
      role: user?.role || "lector",
      servicioId: user?.servicioId || "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (!currentUser) return;
    setIsSubmitting(true);

    try {
      if (isEditing && user) {
        await updateUser(user.uid, { ...values });
        toast({ title: "Usuario actualizado", description: `Se han guardado los cambios para ${values.displayName}.` });
      } else {
        await addUser({ 
            ...values,
            hospitalId: currentUser.hospitalId,
            isActive: true,
        });
        toast({ title: "Usuario creado", description: `El usuario ${values.displayName} ha sido creado.` });
      }

      if (onSave) {
        onSave();
      } else {
        router.push("/admin/usuarios");
        // No need for router.refresh() if parent page re-fetches
      }
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el usuario." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
        <div className="grid gap-4 md:grid-cols-2">
            <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Nombre completo</FormLabel>
                <FormControl><Input placeholder="Ej: Juan Pérez" {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Correo Electrónico</FormLabel>
                <FormControl><Input type="email" placeholder="ej: j.perez@hospital.cl" {...field} disabled={isEditing} /></FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
            <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un rol" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="lector">Lector</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="servicioId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Servicio/Unidad (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un servicio" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="">Ninguno</SelectItem>
                            {catalogs.servicios.map((s) => (<SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onCancel || (() => router.back())} disabled={isSubmitting}>
                Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
