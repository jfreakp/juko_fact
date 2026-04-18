"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { ToastProvider } from "@/components/ui/Toast";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <>{children}</>;
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen" style={{ background: "var(--surface-mid)" }}>
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </ToastProvider>
  );
}
