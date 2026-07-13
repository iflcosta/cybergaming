# Cyber Brasil Arena — LAN house SaaS

Monorepo Bun workspaces + Turborepo: `apps/landing` (site), `apps/cliente` (PWA do cliente), `apps/admin` (painel staff/PDV), `packages/*`.

## Stack
- React 19 + Vite + TanStack Router (routeTree manual em `src/routeTree.gen.tsx`, NÃO file-based)
- Tailwind v4 com CSS vars: `--amber`, `--bg`, `--surface`, `--dim`, `--muted`, `--text`
- Supabase: auth + RLS (funções SECURITY DEFINER p/ evitar recursão, ex. `is_staff_or_admin()`), Realtime, RPCs atômicas (`close_open_session`, `close_fixed_session`)
- Deploys Vercel separados por app (rootDirectory), env vars VITE_ são baked no build

## Regras de negócio
- Tarifas: Hora Vale R$12/h (seg–sex antes das 18h BRT), Hora Pico R$15/h (demais horários e fins de semana); Pacote 3h R$39; Corujão R$79,90 (sex/sáb 22h–06h, término fixo às 06:00)
- Sessão aberta = `sessions.package_type IS NULL`, cobrada por tempo real via `close_open_session` (segmentos em `session_billing_segments`, timezone America/Sao_Paulo)
- Avulso = `sessions.customer_id IS NULL`, paga ao encerrar
- Índice único: 1 sessão ativa por PC

## Sociedade
- Sócio investidor arca com custos; operador (Iago) opera 100%. Lucro líquido 50/50 em horário normal.
- Fora de funcionamento → 60/40 p/ operador: segunda-feira (fechado), antes das 10h, após as 22h (ter–dom), corujão inteiro (coberto pela regra 22h–06h) e feriados (tabela `holidays`).
- `transactions.is_off_hours` é marcado por trigger no insert (BRT); percentuais em `app_settings`.

## Decisões de arquitetura
- **Controle das máquinas (Rota 1, decidido)**: agente próprio nos PCs Windows (Electron ou .NET) — tela de bloqueio fullscreen, assina Supabase Realtime em `sessions` filtrado por `station_id` (active → libera, completed → bloqueia), heartbeat ~30s em `pc_stations.last_seen_at`, widget de tempo restante. NÃO usar software de terceiros (ggLeap etc.).
- Segredos (Resend, service role) SÓ no vault do Supabase, nunca no código. `get_secret` é restrito a service_role.

## Comandos
- `bun install`; build por app: `cd apps/<app> && bun run build`; typecheck: `bunx tsc -p tsconfig.json --noEmit`
