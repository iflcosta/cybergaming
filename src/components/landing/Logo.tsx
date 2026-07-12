export function Logo() {
  return (
    <a href="#hero" className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center bg-gradient-to-br from-accent-primary to-accent-secondary text-xs font-black text-bg-primary">
        CB
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
          Cyber Brasil
        </span>
        <span className="font-display text-base font-black uppercase tracking-tight text-text-primary">
          Arena<span className="text-accent-primary">.</span>
        </span>
      </div>
    </a>
  );
}
