'use client';

import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { onSnapshot, collection, query, where, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/client";
import type { AuditLog } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditLogTable } from "@/components/admin/audit-log-table";

export default function AuditoriaPage() {
  const { user } = useUser();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const hospitalId = user?.hospitalId;

  useEffect(() => {
    if (!hospitalId) {
        setLoading(false);
        return;
    }
    setLoading(true);

    const logsRef = collection(db, "audit_logs");
    const q = query(
      logsRef,
      where("hospitalId", "==", hospitalId),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedLogs = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                timestamp: (data.timestamp as Timestamp)?.toDate(),
            } as AuditLog;
        });
        setLogs(fetchedLogs);
        setLoading(false);
    }, (error) => {
        console.error("Error listening to audit logs:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [hospitalId]);

  const pageHeader = (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Auditoría</h1>
        <p className="text-muted-foreground">
          Revisa los registros de actividad del sistema en tiempo real.
        </p>
      </div>
    </div>
  );

  if (loading) {
      return (
          <div className="space-y-8">
              {pageHeader}
              <Skeleton className="h-[500px] w-full" />
          </div>
      )
  }

  return (
    <div className="space-y-8">
      {pageHeader}
      <AuditLogTable logs={logs} />
    </div>
  );
}
