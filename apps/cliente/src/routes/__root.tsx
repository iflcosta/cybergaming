import { Outlet } from "@tanstack/react-router";

export function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Outlet />
    </div>
  );
}
