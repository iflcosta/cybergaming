# Cyber Brasil Arena — LAN house SaaS

Monorepo Bun workspaces + Turborepo: `apps/landing` (site), `apps/cliente` (PWA do cliente), `apps/admin` (painel staff/PDV), `packages/*`.

## Stack
- React 19 + Vite + TanStack Router (routeTree manual em `src/routeTree.gen.tsx`, NÃO file-based)
- Tailwind v4 com CSS vars: `--amber`, `--bg`, `--surface`, `--dim`, `--muted`, `--text`
- Supabase: auth + RLS (funções SECURITY DEFINER p/ evitar recursão, ex. `is_staff_or_admin()`), Realtime, RPCs atômicas (`close_open_session`, `close_fixed_session`)
- Deploys Vercel separados por app (rootDirectory), env vars VITE_ são baked no build

## Regras de negócio
- Tarifas (editáveis em `packages`, tela Config): Hora Vale R$12/h (seg–sex antes das 18h BRT), Hora Pico R$25/h (demais horários e fins de semana); Pacote 3h R$49,90; Corujão R$79,90 (sex/sáb 22h–06h, término fixo às 06:00)
- Desconto Founding Member (automático, `customer_discount_pct()`): 25% no primeiro pagamento (voucher, 60 dias do cadastro, marca `profiles.founding_discount_used`) e 10% vitalício depois — aplicado em pacotes, sessão aberta e reservas
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

## Notificações
- Edge function `notify-reservation` (Resend, mesmo padrão de `send-welcome-email`): dispara por trigger em `reservations`/`recurring_reservations` via `pg_net` (`notify_reservation_email`) nos eventos awaiting_payment e confirmed/active. Falha de e-mail nunca bloqueia a transação (EXCEPTION WHEN OTHERS).

## Pagamentos online (Asaas)
- Edge functions `asaas-create-charge` (verify_jwt true, chamada pelo cliente autenticado) e `asaas-webhook` (verify_jwt false, autenticada por token compartilhado na query string `?token=`, guardado em `ASAAS_WEBHOOK_TOKEN` no vault).
- `asaas-create-charge`: garante `profiles.asaas_customer_id` (cria cliente no Asaas se faltar, exige CPF), cria cobrança `billingType: UNDEFINED` (cliente escolhe PIX/cartão/boleto na página hospedada do Asaas via `invoiceUrl`), grava transação `pending` via RPC `create_asaas_transaction`.
- Webhook: eventos `PAYMENT_RECEIVED`/`PAYMENT_CONFIRMED` chamam `confirm_asaas_payment(payment_id)` (idempotente, credita `profiles.credits_balance` e marca a transação `paid`) — 100% automático, sem staff.
- Configurar na Asaas (dashboard → Webhooks): URL = `https://scrswxgvlwfndsqrclgb.supabase.co/functions/v1/asaas-webhook` (sem query string — o Asaas manda o token no header `asaas-access-token`, precisa bater com `ASAAS_WEBHOOK_TOKEN` no vault), eventos `PAYMENT_RECEIVED` e `PAYMENT_CONFIRMED`.
- Fluxo de créditos no app cliente: "Pagar agora — PIX/Cartão" (Asaas, automático) como opção principal; "Prefiro pagar no caixa" (`request_credit_purchase`, staff confirma) como alternativa.

## Decisões de arquitetura
- **Controle das máquinas (Rota 1, decidido)**: agente próprio nos PCs Windows (Electron ou .NET) — tela de bloqueio fullscreen, assina Supabase Realtime em `sessions` filtrado por `station_id` (active → libera, completed → bloqueia), heartbeat ~30s em `pc_stations.last_seen_at`, widget de tempo restante. NÃO usar software de terceiros (ggLeap etc.).
- Segredos (Resend, service role) SÓ no vault do Supabase, nunca no código. `get_secret` é restrito a service_role.
- `prevent_self_privilege_escalation` (trigger em `profiles`, bloqueia cliente comum de alterar `role`/`credits_balance`/`is_founding_member` via update direto) precisa liberar `current_user = 'postgres'` — é assim que toda RPC `SECURITY DEFINER` de dono `postgres` (que é a esmagadora maioria: `confirm_asaas_payment`, `pay_reservation_with_credits`, `customer_discount_pct`, etc.) roda. Sem essa exceção, o trigger reverte silenciosamente essas mutações internas mesmo quando a RPC reporta sucesso — já causou um bug real onde o webhook do Asaas marcava a transação `paid` mas o saldo não subia.

## Comandos
- `bun install`; build por app: `cd apps/<app> && bun run build`; typecheck: `bunx tsc -p tsconfig.json --noEmit`
