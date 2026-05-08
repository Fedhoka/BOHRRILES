import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.js";
import NotificationBell from "./NotificationBell.js";
import { useAuthStore } from "../store/auth.js";

export default function AppShell() {
  const { activeClientId } = useAuthStore();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 flex-none flex items-center justify-end gap-3 px-6 bg-white border-b border-slate-200">
          {!activeClientId && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
              Seleccioná un cliente
            </span>
          )}
          <NotificationBell />
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {!activeClientId ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <p>Seleccioná un cliente en el panel izquierdo para continuar.</p>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
