import { Suspense, useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import { useBackendStatus } from "../../services/createStore";

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { configured, error } = useBackendStatus();

  return (
    <div className="h-screen flex bg-ink-950 font-body overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-64 shrink-0">
        <AdminSidebar />
      </div>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-ink-950/70" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 animate-fadeUp">
            <AdminSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <AdminTopbar onMenuClick={() => setMobileOpen(true)} />
        {(!configured || error) && (
          <div className={`px-4 py-2 text-xs font-body ${error ? "bg-rose-950 text-rose-200" : "bg-amber-950 text-amber-200"}`} role="status">
            {error || "Supabase is not configured. Changes are stored only in this browser and will not sync with visitors."}
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Suspense fallback={<p className="text-mist-400 font-body text-sm py-10 text-center">Loading…</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
