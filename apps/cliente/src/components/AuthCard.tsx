import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10">
      {/* Logo */}
      <div className="mb-8 text-center">
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[--muted] mb-1">
          Cyber Brasil
        </p>
        <h1
          className="text-3xl font-black uppercase tracking-tight"
          style={{ color: "var(--amber)", fontFamily: "Impact, Arial Black, sans-serif" }}
        >
          Arena
        </h1>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-xl p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}
      >
        <h2 className="text-lg font-bold mb-1">{title}</h2>
        {subtitle && <p className="text-sm text-[--muted] mb-6">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
