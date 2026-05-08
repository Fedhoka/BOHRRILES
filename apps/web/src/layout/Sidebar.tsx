import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.js";
import { api } from "../lib/api.js";
import ClientSwitcher from "./ClientSwitcher.js";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles?: string[];
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: "▦" },
  { to: "/vat", label: "IVA", icon: "%" },
  { to: "/payroll", label: "Sueldos", icon: "₿" },
  { to: "/annual", label: "Anual", icon: "📊" },
  { to: "/exports", label: "Exportar", icon: "↓" },
  { to: "/studio", label: "Estudio", icon: "⚙", roles: ["admin_studio", "accountant"] },
];

export default function Sidebar() {
  const { user, clear } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await api.post("/auth/logout").catch(() => null);
    clear();
    navigate("/login", { replace: true });
  };

  const visible = NAV.filter((n) => !n.roles || n.roles.includes(user?.role ?? ""));

  return (
    <aside className="w-56 flex-none flex flex-col bg-white border-r border-slate-200 h-screen">
      <div className="px-4 py-5 border-b border-slate-100">
        <span className="text-xl font-bold text-brand-700">BOHR</span>
        <p className="text-xs text-slate-400 mt-0.5">Gestión Tributaria</p>
      </div>

      <div className="px-4 py-3 border-b border-slate-100">
        <ClientSwitcher />
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : "text-slate-600 hover:bg-slate-50"
              }`
            }
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-slate-100">
        <p className="text-xs font-medium text-slate-700 truncate">{user?.name}</p>
        <p className="text-xs text-slate-400 truncate">{user?.role}</p>
        <button
          onClick={handleLogout}
          className="mt-3 text-xs text-slate-500 hover:text-red-500 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
