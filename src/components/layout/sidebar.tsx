
"use client";

import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  File,
  FilePlus,
  FolderOpen,
  Users,
  Book,
  FileCog,
  Shield,
  LifeBuoy,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";

const menuItems = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    roles: ["admin", "editor", "lector"],
  },
  {
    href: "/documentos/nuevo",
    icon: FilePlus,
    label: "Subir Documento",
    roles: ["admin", "editor"],
  },
  {
    href: "/documentos",
    icon: FolderOpen,
    label: "Explorar Documentos",
    roles: ["admin", "editor", "lector"],
  },
];

const adminMenuItems = [
  {
    href: "/admin/usuarios",
    icon: Users,
    label: "Gestión de Usuarios",
    roles: ["admin"],
  },
  {
    href: "/admin/catalogos",
    icon: Book,
    label: "Gestión de Catálogos",
    roles: ["admin"],
  },
  {
    href: "/admin/auditoria",
    icon: Shield,
    label: "Auditoría",
    roles: ["admin"],
  },
  {
    href: "/admin/configuracion",
    icon: FileCog,
    label: "Parámetros",
    roles: ["admin"],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isUserInRole = (roles: string[]) => user && roles.includes(user.role);

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-12 items-center gap-2 px-2">
          <File className="text-primary" />
          <span className="truncate text-lg font-semibold text-sidebar-foreground">
            AcreditaDoc Pro
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {menuItems.filter(item => isUserInRole(item.roles)).map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          {isUserInRole(['admin']) && <div className="my-2 border-t border-sidebar-border -mx-2"></div>}
          
          {adminMenuItems.filter(item => isUserInRole(item.roles)).map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Ayuda y Soporte">
              <LifeBuoy />
              <span>Soporte</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Configuración">
              <Settings />
              <span>Configuración</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
