"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { ToastProvider } from "@/components/ui/Toast";
import { BusinessTypeProvider } from "@/lib/business-context";

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
    <BusinessTypeProvider>
      <ToastProvider>
        <div className="flex flex-col h-screen" style={{ background: "var(--surface-mid)" }}>
          <TopBar />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </BusinessTypeProvider>
  );
}
