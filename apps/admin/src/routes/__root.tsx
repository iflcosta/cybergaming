import { Outlet, Link, useNavigate } from "@tanstack/react-router";
import { Monitor, Clock, Users, DollarSign, Trophy, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { useEffect } from "react";

const navItems = [
  { to: "/",             label: "Dashboard",  icon: Monitor },
  { to: "/sessions",     label: "Sessões",    icon: Clock },
  { to: "/stations",     label: "PCs",        icon: Monitor },
  { to: "/customers",    label: "Clientes",   icon: Users },
  { to: "/tournaments",  label: "Torneios",   icon: Trophy },
  { to: "/transactions", label: "Financeiro", icon: DollarSign },
];

export function RootLayout() {
  const { user, profile, loading, isStaff, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (!isStaff) { navigate({ to: "/login" }); return; }
  }, [user, loading, isStaff, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--amber) transparent transparent transparent" }} />
      </div>
    );
  }

  if (!user || !isStaff) return null;

  return (
    <div className="flex min-h-screen">
      <aside
        className="hidden md:flex flex-col gap-1 p-4 shrink-0"
        style={{ width: "var(--sidebar-w)", background: "var(--surface)", borderRight: "1px solid var(--dim)" }}
      >
        <div className="mb-6 px-2">
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--amber)" }}>
            Cyber Brasil
          </span>
          <p className="text-xs text-slate-500 mt-0.5">Admin Panel</p>
        </div>

        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium text-slate-400 hover:text-white transition-colors"
            activeProps={{ style: { color: "var(--amber)", background: "rgba(251,191,36,0.08)" } }}
            activeOptions={item.to === "/" ? { exact: true } : undefined}
          >
            <item.icon size={15} />
            {item.label}
          </Link>
        ))}

        <div className="mt-auto pt-4 border-t" style={{ borderColor: "var(--dim)" }}>
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-semibold text-white truncate">{profile?.full_name ?? profile?.email}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{profile?.role}</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full px-3 py-2 rounded text-sm text-slate-500 hover:text-white transition-colors"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
