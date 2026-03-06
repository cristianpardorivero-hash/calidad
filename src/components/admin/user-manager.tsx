
"use client";

import type { Catalogs, UserProfile } from "@/lib/types";
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  ToggleLeft,
  ToggleRight,
  Edit,
  Trash2,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { 
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { UserForm } from "./user-form";
import { updateUser } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";

interface UserManagerProps {
    initialUsers: UserProfile[];
    catalogs: Catalogs;
    onUsersChange?: () => void;
}

export function UserManager({ initialUsers, catalogs, onUsersChange }: UserManagerProps) {
  const { user: currentUser } = useUser();
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  const { toast } = useToast();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role === 'admin') return 'default';
    if (role === 'editor') return 'secondary';
    return 'outline';
  }

  const handleToggleActive = async (user: UserProfile) => {
    setLoadingStates(prev => ({...prev, [user.uid]: true}));
    try {
        await updateUser(user.uid, { isActive: !user.isActive });
        toast({
            title: `Usuario ${user.isActive ? 'desactivado' : 'activado'}`,
            description: `${user.displayName} ha sido ${user.isActive ? 'desactivado' : 'activado'}.`
        });
        onUsersChange?.(); // Re-fetch users if needed
    } catch(e) {
        toast({ variant: 'destructive', title: "Error", description: "No se pudo actualizar el estado del usuario."});
    } finally {
        setLoadingStates(prev => ({...prev, [user.uid]: false}));
    }
  }

  const handleDelete = async () => {
    if (!userToDelete || !currentUser) return;

    const deletingUser = userToDelete;
    setLoadingStates(prev => ({ ...prev, [deletingUser.uid]: true }));

    try {
        await updateUser(deletingUser.uid, { isDeleted: true, isActive: false });
        
        setUserToDelete(null); // Close on success

        toast({
            title: "Usuario eliminado",
            description: `${deletingUser.displayName} ha sido eliminado.`
        });
        onUsersChange?.();
    } catch (e) {
        toast({ variant: 'destructive', title: "Error", description: "No se pudo eliminar el usuario."});
    } finally {
        setLoadingStates(prev => ({ ...prev, [deletingUser.uid]: false }));
    }
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="hidden md:table-cell">Estado</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialUsers.map((user) => (
              <TableRow key={user.uid}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={`https://picsum.photos/seed/${user.uid}/100/100`} />
                      <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">{user.role}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant={user.isActive ? "secondary" : "destructive"}>
                    {user.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {loadingStates[user.uid] ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setUserToEdit(user)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar Usuario
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleToggleActive(user)}>
                          {user.isActive ? (
                            <><ToggleLeft className="mr-2 h-4 w-4" /> Desactivar</>
                          ) : (
                            <><ToggleRight className="mr-2 h-4 w-4" /> Activar</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive focus:bg-destructive/10" 
                          onSelect={(e) => {
                            e.preventDefault();
                            setUserToDelete(user);
                          }}
                        >
                            <Trash2 className="mr-2 h-4 w-4"/> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!userToEdit} onOpenChange={(open) => !open && setUserToEdit(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica los detalles del usuario y guarda los cambios.
            </DialogDescription>
          </DialogHeader>
          {userToEdit && (
            <UserForm 
                user={userToEdit} 
                catalogs={catalogs} 
                onSave={() => {
                    setUserToEdit(null);
                    onUsersChange?.();
                }}
                onCancel={() => setUserToEdit(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete User Confirmation */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro de que deseas eliminar a este usuario?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Esta acción marcará al usuario como eliminado y no podrá acceder al sistema. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
