import Sidebar from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen" style={{ background: "var(--surface-mid)" }}>
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </ToastProvider>
  );
}
