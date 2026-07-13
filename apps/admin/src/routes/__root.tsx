import { Outlet, Link } from "@tanstack/react-router";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/sessions", label: "Sessões" },
  { to: "/stations", label: "PCs" },
  { to: "/customers", label: "Clientes" },
  { to: "/tournaments", label: "Torneios" },
  { to: "/transactions", label: "Financeiro" },
];

export function RootLayout() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className="hidden md:flex flex-col gap-1 p-4 shrink-0"
        style={{
          width: "var(--sidebar-w)",
          background: "var(--surface)",
          borderRight: "1px solid var(--dim)",
        }}
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
            className="px-3 py-2 rounded text-sm font-medium text-slate-400 hover:text-white transition-colors"
            activeProps={{ style: { color: "var(--amber)", background: "rgba(251,191,36,0.08)" } }}
          >
            {item.label}
          </Link>
        ))}
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
