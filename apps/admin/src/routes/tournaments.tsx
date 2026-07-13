export function TournamentsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-6">Torneios</h1>
      <div
        className="rounded-lg p-8 text-center"
        style={{ background: "var(--surface)", border: "1px dashed var(--dim)" }}
      >
        <p className="text-slate-400 text-sm font-bold mb-1">Em breve</p>
        <p className="text-slate-600 text-xs">Gestão de torneios mensais e trimestrais</p>
      </div>
    </div>
  );
}
