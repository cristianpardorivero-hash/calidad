"use client";

import type { UserProfile } from "@/lib/types";
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
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  ToggleLeft,
  ToggleRight,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

export function UserManager({ users }: { users: UserProfile[] }) {
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

  return (
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
          {users.map((user) => (
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
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <Shield className="mr-2 h-4 w-4" /> Cambiar Rol
                    </DropdownMenuItem>
                    {user.isActive ? (
                      <DropdownMenuItem className="text-destructive">
                        <ToggleLeft className="mr-2 h-4 w-4" /> Desactivar
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem className="text-green-600">
                        <ToggleRight className="mr-2 h-4 w-4" /> Activar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
