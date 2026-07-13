import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { insertLead } from "@/lib/supabase";
import { JOGOS, ESTILOS_JOGO, INTERESSES } from "./constants";
import { useUtmParams } from "./hooks";
import { Reveal } from "./Reveal";

function RadioGroup<T extends string>({
  label,
  name,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  options: readonly { value: T; label: string; desc: string }[];
  value: T | "";
  onChange: (v: T) => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="ml-1 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
        {label}
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer flex-col gap-1 border p-4 transition-all duration-200 active:scale-[0.97] ${
              value === opt.value
                ? "border-accent-primary/60 bg-accent-primary/10 scale-[1.01]"
                : "border-white/8 hover:border-white/20"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <span className="text-sm font-bold text-text-primary">{opt.label}</span>
            <span className="text-[11px] leading-snug text-text-tertiary">{opt.desc}</span>
          </label>
        ))}
      </div>
      {error && <p className="ml-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function StepLabel({ n, label, done }: { n: string; label: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-black transition-colors ${
          done
            ? "bg-accent-secondary text-bg-primary"
            : "bg-accent-primary text-text-on-accent"
        }`}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : n}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">
        {label}
      </span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

function Field({
  id,
  label,
  type,
  placeholder,
  error,
  autoComplete,
}: {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="ml-1 block text-[10px] font-semibold uppercase tracking-widest text-text-tertiary"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full border bg-bg-secondary px-5 py-4 text-base text-text-primary placeholder:text-text-tertiary transition-colors focus:outline-none ${
          error ? "border-destructive" : "border-white/8 focus:border-accent-primary/60"
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="ml-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

export function FormSection() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [jogo, setJogo] = useState("");
  const [jogoOutro, setJogoOutro] = useState("");
  const [estilo, setEstilo] = useState<"solo" | "equipe-fixa" | "procurando" | "">("");
  const [interesse, setInteresse] = useState<"competir" | "assistir" | "ambos" | "">("");
  const utm = useUtmParams();

  function validate(nome: string, whatsapp: string, email: string) {
    const errs: Record<string, string> = {};
    if (nome.length < 2) errs.nome = "Digita seu nome completo";
    if (whatsapp.replace(/\D/g, "").length < 10) errs.whatsapp = "WhatsApp inválido";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Email inválido";
    if (!jogo) errs.jogo = "Seleciona seu jogo principal";
    if (!estilo) errs.estilo = "Seleciona seu estilo de jogo";
    if (!interesse) errs.interesse = "Seleciona seu interesse";
    if (!checked) errs.lgpd = "Precisa aceitar pra continuar";
    return errs;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nome = String(fd.get("nome") || "").trim();
    const whatsapp = String(fd.get("whatsapp") || "").trim();
    const email = String(fd.get("email") || "").trim();

    const errs = validate(nome, whatsapp, email);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setStatus("loading");
    try {
      await insertLead({
        nome,
        whatsapp,
        email,
        jogo_principal: jogo === "Outro" ? jogoOutro || "Outro" : jogo,
        estilo_jogo: estilo,
        interesse_campeonatos: interesse,
        ...utm,
      });
      setStatus("success");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "23505") {
        setStatus("success");
      } else {
        console.error("insertLead failed:", err);
        setStatus("error");
      }
    }
  }

  const step1Done = status === "success";

  return (
    <section id="form" className="px-6 py-16 md:py-32">
      <div className="mx-auto max-w-2xl">
        <Reveal className="text-center">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-secondary">
            — Lista exclusiva
          </div>
          <h2 className="font-display text-4xl font-black uppercase tracking-tighter md:text-5xl">
            Entre antes{" "}
            <span className="bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
              de todo mundo
            </span>
          </h2>
          <p className="mt-4 text-text-secondary">
            100% gratuito. Sem pagamento. Sem compromisso. Só benefícios.
          </p>
        </Reveal>

        <Reveal className="mt-10">
          {status === "success" ? (
            <div
              className="rounded-xl border border-accent-primary/40 p-10 text-center"
              role="status"
              aria-live="polite"
            >
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-accent-primary/30 bg-accent-primary/10">
                <Check className="h-7 w-7 text-accent-primary" />
              </div>
              <h3 className="font-display text-2xl font-black uppercase tracking-tight">
                Você está dentro!
              </h3>
              <p className="mt-3 text-text-secondary">
                Voucher enviado pro seu email. Confere a caixa de entrada{" "}
                <span className="text-text-primary">(e o spam, vai que cola)</span>.
              </p>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-accent-primary">
                Bem-vindo ao founding member club.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-8" aria-live="polite">
              <div className="space-y-5">
                <StepLabel n="01" label="Seus dados" done={step1Done} />
                <Field
                  id="nome"
                  label="Nome completo"
                  type="text"
                  placeholder="Como você quer ser chamado"
                  error={errors.nome}
                  autoComplete="name"
                />
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    id="whatsapp"
                    label="WhatsApp"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    error={errors.whatsapp}
                    autoComplete="tel"
                  />
                  <Field
                    id="email"
                    label="E-mail"
                    type="email"
                    placeholder="voce@email.com"
                    error={errors.email}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-5 border-t border-white/5 pt-6">
                <StepLabel n="02" label="Seu perfil gamer" />

                <div className="space-y-2">
                  <label
                    htmlFor="jogo"
                    className="ml-1 block text-[10px] font-semibold uppercase tracking-widest text-text-tertiary"
                  >
                    Jogo principal
                  </label>
                  <select
                    id="jogo"
                    value={jogo}
                    onChange={(e) => setJogo(e.target.value)}
                    aria-invalid={!!errors.jogo}
                    className={`w-full border bg-bg-secondary px-5 py-4 text-base text-text-primary transition-colors focus:outline-none ${
                      errors.jogo
                        ? "border-destructive"
                        : "border-white/8 focus:border-accent-primary/60"
                    }`}
                  >
                    <option value="" disabled>Seleciona seu jogo...</option>
                    {JOGOS.map((j) => (
                      <option key={j} value={j} className="bg-bg-secondary">
                        {j}
                      </option>
                    ))}
                  </select>
                  {errors.jogo && <p className="ml-1 text-xs text-destructive">{errors.jogo}</p>}
                  {jogo === "Outro" && (
                    <input
                      type="text"
                      value={jogoOutro}
                      onChange={(e) => setJogoOutro(e.target.value)}
                      placeholder="Qual jogo você joga?"
                      autoFocus
                      className="w-full border border-white/8 bg-bg-secondary px-5 py-4 text-base text-text-primary placeholder:text-text-tertiary focus:border-accent-primary/60 focus:outline-none transition-colors"
                    />
                  )}
                </div>

                <RadioGroup
                  label="Como você joga?"
                  name="estilo_jogo"
                  options={ESTILOS_JOGO}
                  value={estilo}
                  onChange={setEstilo}
                  error={errors.estilo}
                />

                <RadioGroup
                  label="Interesse em campeonatos e esports?"
                  name="interesse_campeonatos"
                  options={INTERESSES}
                  value={interesse}
                  onChange={setInteresse}
                  error={errors.interesse}
                />
              </div>

              <div className="border-t border-white/5 pt-5">
                <label className="flex cursor-pointer items-start gap-3 py-2 text-xs leading-relaxed text-text-tertiary">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                    className="mt-1 h-4 w-4 flex-shrink-0 accent-accent-primary"
                    aria-describedby={errors.lgpd ? "lgpd-error" : undefined}
                    aria-invalid={!!errors.lgpd}
                  />
                  <span>
                    Li e aceito a{" "}
                    <Link to="/privacidade" className="text-accent-primary underline-offset-2 hover:underline">
                      política de privacidade
                    </Link>{" "}
                    e os{" "}
                    <Link to="/termos" className="text-accent-primary underline-offset-2 hover:underline">
                      termos de uso
                    </Link>
                    . Posso cancelar quando quiser.
                  </span>
                </label>
                {errors.lgpd && (
                  <p id="lgpd-error" className="text-xs text-destructive">{errors.lgpd}</p>
                )}
                {status === "error" && (
                  <p className="mt-3 text-sm text-destructive">
                    Erro ao enviar. Tenta de novo ou nos contata pelo WhatsApp.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={status === "loading"}
                className="group relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden bg-accent-primary px-6 py-5 text-sm font-black uppercase tracking-widest text-text-on-accent transition-all duration-300 hover:brightness-110 hover:glow-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {status === "loading" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    <>
                      Garantir minha vaga — é grátis
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
              </button>

              <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                Dados protegidos pela LGPD · Zero spam · Descadastre quando quiser
              </p>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
