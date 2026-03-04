import { UserManager } from "@/components/admin/user-manager";
import { getUsers } from "@/lib/data";

export default async function AdminUsersPage() {
  const hospitalId = "hcurepto";
  const users = await getUsers(hospitalId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
        <p className="text-muted-foreground">
          Activa, desactiva y asigna roles a los usuarios de tu hospital.
        </p>
      </div>
      <UserManager users={users} />
    </div>
  );
}
