'use client';

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
  FormDescription,
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
import { useState, useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { addUser, updateUser } from "@/lib/data";
import { useUser } from "@/hooks/use-user";
import { Checkbox } from "../ui/checkbox";
import { ScrollArea } from "../ui/scroll-area";

const availablePages = [
  { id: "/dashboard", label: "Dashboard" },
  { id: "/documentos", label: "Explorar Documentos" },
  { id: "/documentos/nuevo", label: "Subir Documento" },
  { id: "/mis-documentos", label: "Mis Documentos" },
  { id: "/admin/usuarios", label: "Gestión de Usuarios" },
  { id: "/admin/catalogos", label: "Gestión de Catálogos" },
  { id: "/admin/auditoria", label: "Auditoría" },
  { id: "/admin/configuracion", label: "Parámetros" },
];

const baseSchema = z.object({
  displayName: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Correo electrónico inválido."),
  role: z.enum(["admin", "editor", "lector"], { required_error: "Debe seleccionar un rol."}),
  servicioIds: z.array(z.string()).optional(),
  allowedPages: z.array(z.string()).optional(),
});

const createSchema = baseSchema.extend({
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
}).refine((data) => data.password, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof baseSchema>;

interface UserFormProps {
  user?: UserProfile;
  catalogs: Catalogs;
  onSave?: () => void;
  onCancel?: () => void;
}

export function UserForm({ user, catalogs, onSave, onCancel }: UserFormProps) {
  const { user: currentUser } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!user;

  const formSchema = isEditing ? baseSchema : createSchema;

  const defaultValues = useMemo(() => {
    if (isEditing && user) {
      return {
        displayName: user.displayName || "",
        email: user.email || "",
        role: user.role || "lector",
        servicioIds: user.servicioIds || [],
        allowedPages: user.allowedPages || [],
      };
    }
    return {
      displayName: "",
      email: "",
      role: "lector",
      servicioIds: [],
      password: "",
      allowedPages: [],
    };
  }, [user, isEditing]);


  const form = useForm<EditFormValues | CreateFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues as any,
  });

  useEffect(() => {
    form.reset(defaultValues as any);
  }, [defaultValues, form]);


  async function onSubmit(values: EditFormValues | CreateFormValues) {
    if (!currentUser) return;
    setIsSubmitting(true);

    try {
      if (isEditing && user) {
        await updateUser(user.uid, values);
        toast({ title: "Usuario actualizado", description: `Se han guardado los cambios para ${values.displayName}.` });
      } else {
        const createValues = values as CreateFormValues;
        await addUser({ 
            ...createValues,
            hospitalId: currentUser.hospitalId,
            isActive: true,
        });
        toast({ title: "Usuario creado", description: `El usuario ${values.displayName} ha sido creado.` });
      }

      if (onSave) {
        onSave();
      } else {
        router.push("/admin/usuarios");
      }
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo guardar el usuario." });
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

        {!isEditing && (
            <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormDescription>La contraseña debe tener al menos 6 caracteres.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        )}
        
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
       
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="servicioIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Servicios/Unidades (Opcional)</FormLabel>
                <ScrollArea className="rounded-md border h-40 p-4">
                  {catalogs.servicios.map((servicio) => (
                    <FormItem
                      key={servicio.id}
                      className="flex flex-row items-center space-x-3 space-y-0 mb-3"
                    >
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(servicio.id)}
                          onCheckedChange={(checked) => {
                            return checked
                              ? field.onChange([...(field.value || []), servicio.id])
                              : field.onChange(
                                (field.value || []).filter(
                                  (value) => value !== servicio.id
                                )
                              );
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal text-sm">
                        {servicio.nombre}
                      </FormLabel>
                    </FormItem>
                  ))}
                </ScrollArea>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="allowedPages"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Permisos de Página Específicos (Opcional)</FormLabel>
                <ScrollArea className="rounded-md border h-40 p-4">
                  {availablePages.map((page) => (
                    <FormItem
                      key={page.id}
                      className="flex flex-row items-center space-x-3 space-y-0 mb-3"
                    >
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(page.id)}
                          onCheckedChange={(checked) => {
                            return checked
                              ? field.onChange([...(field.value || []), page.id])
                              : field.onChange(
                                (field.value || []).filter(
                                  (value) => value !== page.id
                                )
                              );
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal text-sm">
                        {page.label}
                      </FormLabel>
                    </FormItem>
                  ))}
                </ScrollArea>
                 <FormDescription>
                  Si se seleccionan páginas, se ignorarán los permisos del rol.
                </FormDescription>
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
