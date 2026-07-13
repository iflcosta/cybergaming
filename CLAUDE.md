# Cyber Brasil Arena — LAN house SaaS

Monorepo Bun workspaces + Turborepo: `apps/landing` (site), `apps/cliente` (PWA do cliente), `apps/admin` (painel staff/PDV), `packages/*`.

## Stack
- React 19 + Vite + TanStack Router (routeTree manual em `src/routeTree.gen.tsx`, NÃO file-based)
- Tailwind v4 com CSS vars: `--amber`, `--bg`, `--surface`, `--dim`, `--muted`, `--text`
- Supabase: auth + RLS (funções SECURITY DEFINER p/ evitar recursão, ex. `is_staff_or_admin()`), Realtime, RPCs atômicas (`close_open_session`, `close_fixed_session`)
- Deploys Vercel separados por app (rootDirectory), env vars VITE_ são baked no build

## Regras de negócio
- Tarifas (editáveis em `packages`, tela Config): Hora Vale R$12/h (seg–sex antes das 18h BRT), Hora Pico R$25/h (demais horários e fins de semana); Pacote 3h R$49,90 (R$39,90 Founding Member — `founding_price_cents`); Corujão R$79,90 (sex/sáb 22h–06h, término fixo às 06:00)
- Sessão aberta = `sessions.package_type IS NULL`, cobrada por tempo real via `close_open_session` (segmentos em `session_billing_segments`, timezone America/Sao_Paulo)
- Avulso = `sessions.customer_id IS NULL`, paga ao encerrar
- Índice único: 1 sessão ativa por PC

## Reservas
- Avulsa/grupo (`reservations`, até 10 PCs, badge "grupo" a partir de 5): antecedência mínima 4h, ter–dom 10h–22h, preço = tarifa vale/pico × duração (ou pacote_3h se 180min), × nº de PCs
- Recorrente mensal (`recurring_reservations` → materializa em `reservations` no pagamento): mesmo dia da semana + horário todo mês; 3h/sessão = preço fixo do pacote_3h para o MÊS TODO; <3h = tarifa avulsa por ocorrência
- Trava de pagamento: status `awaiting_payment`, `payment_deadline_at` = criação + 1h; paga com créditos (`pay_reservation_with_credits`/`pay_recurring_with_credits`, instantâneo) ou no caixa (`confirm_reservation_payment`/`confirm_recurring_payment`, staff); pg_cron expira a cada 5min se disponível, senão lazy-expire nas RPCs de pagamento
- PWA: `get_station_availability(day)` (vagas por hora) e `get_public_station_status()` (ocupação ao vivo sem PII) — ambas `anon`+`authenticated`

## Sociedade
- Sócio investidor arca com custos; operador (Iago) opera 100%. Lucro líquido 50/50 em horário normal.
- Fora de funcionamento → 60/40 p/ operador: segunda-feira (fechado), antes das 10h, após as 22h (ter–dom), corujão inteiro (coberto pela regra 22h–06h) e feriados (tabela `holidays`).
- `transactions.is_off_hours` é marcado por trigger no insert (BRT); percentuais em `app_settings`.

## Decisões de arquitetura
- **Controle das máquinas (Rota 1, decidido)**: agente próprio nos PCs Windows (Electron ou .NET) — tela de bloqueio fullscreen, assina Supabase Realtime em `sessions` filtrado por `station_id` (active → libera, completed → bloqueia), heartbeat ~30s em `pc_stations.last_seen_at`, widget de tempo restante. NÃO usar software de terceiros (ggLeap etc.).
- Segredos (Resend, service role) SÓ no vault do Supabase, nunca no código. `get_secret` é restrito a service_role.

## Comandos
- `bun install`; build por app: `cd apps/<app> && bun run build`; typecheck: `bunx tsc -p tsconfig.json --noEmit`
