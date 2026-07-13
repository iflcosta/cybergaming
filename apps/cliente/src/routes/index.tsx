import { ARENA_NAME, PRICES } from "@cybergaming/shared";

export function IndexPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 px-6 text-center">
      <h1 className="text-3xl font-black uppercase tracking-tight" style={{ color: "var(--amber)" }}>
        {ARENA_NAME}
      </h1>
      <p className="text-slate-400 text-sm">
        App do cliente — em desenvolvimento
      </p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs text-left">
        {Object.entries(PRICES).map(([key, cents]) => (
          <div
            key={key}
            className="rounded-lg p-3"
            style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}
          >
            <p className="text-xs text-slate-500 uppercase tracking-widest">{key.replace("_", " ")}</p>
            <p className="text-lg font-bold mt-1">
              R${(cents / 100).toFixed(2).replace(".", ",")}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
