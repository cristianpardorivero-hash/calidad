'use client';

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
  User as UserIcon,
  FileHeart,
  FileClock,
} from "lucide-react";
import Link from "next/link";
import { useUser } from "@/hooks/use-user";

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
  {
    href: "/documentos/vencimientos",
    icon: FileClock,
    label: "Vencimientos",
    roles: ["admin", "editor", "lector"],
  },
  {
    href: "/mis-documentos",
    icon: FileHeart,
    label: "Mis Documentos",
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
  const { user } = useUser();

  const userHasAccess = (itemRoles: string[], itemHref: string) => {
    if (!user) return false;

    // Priority 1: User-specific page permissions.
    // If allowedPages is defined and has items, it is the source of truth.
    if (user.allowedPages && user.allowedPages.length > 0) {
      return user.allowedPages.includes(itemHref);
    }

    // Priority 2: Fallback to role-based permissions.
    return itemRoles.includes(user.role);
  };

  const visibleMenuItems = menuItems.filter((item) =>
    userHasAccess(item.roles, item.href)
  );
  const visibleAdminItems = adminMenuItems.filter((item) =>
    userHasAccess(item.roles, item.href)
  );

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
          {visibleMenuItems.map((item) => (
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

          {visibleAdminItems.length > 0 && (
            <div className="my-2 border-t border-sidebar-border -mx-2"></div>
          )}

          {visibleAdminItems.map((item) => (
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
            <SidebarMenuButton asChild tooltip="Perfil">
                <Link href="/perfil">
                    <UserIcon />
                    <span>Perfil</span>
                </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
