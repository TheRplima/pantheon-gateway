# Pantheon Cutover Plan (API -> Source of Truth neste repositório)

## Objetivo

Migrar a API Laravel de `~/projects/pantheon/api` para este repositório e estabelecer **fonte única de verdade** aqui para:

- API
- contratos de eventos (`packages/contracts`)
- documentação de lifecycle

## Decisão de Source of Truth

- A partir do **Cutover Day**, este repositório é o único local autorizado para mudanças em contratos/API/docs Pantheon.
- O repositório antigo passa a ser **read-only de referência histórica**.

## Escopo do Cutover (Fase MVP)

- Inclui:
  - código da API Laravel
  - migrations e modelos necessários ao lifecycle MVP
  - docs técnicas essenciais de API/lifecycle
- Não inclui (agora):
  - governança avançada completa
  - state machine v3.1 completa com todos os gates

---

## Fase 0 — Preparação (D-2 a D-1)

1. Criar diretório-alvo para API no monorepo (`apps/api`).
2. Congelar mudanças estruturais no repo antigo (somente bugfix crítico).
3. Confirmar contratos v1 atuais como baseline (`packages/contracts/schemas/v1/*`).
4. Definir branch de cutover (`cutover/pantheon-api-import`).

**Aceite**

- Estrutura alvo criada.
- Baseline de contratos documentada.

---

## Fase 1 — Importação Controlada (D0)

1. Copiar API Laravel para `apps/api` preservando histórico mínimo de origem em `README` de migração.
2. Ajustar paths/env/docker para rodar API no contexto deste repo.
3. Validar bootstrap local da API (instalação, migrações, subida).

**Aceite**

- API sobe localmente no novo path.
- Migrations aplicam sem erro.

---

## Fase 2 — Hardening obrigatório (D0-D1)

Aplicar patch set P0/P1 da auditoria:

- `docs/pantheon/api-reuse-audit-checklist.md`

Mínimo:

1. Corrigir auth repository mismatch (`findActiveById`).
2. Corrigir publish inconsistente de create.
3. Remover conflito de rota pública/autenticada.
4. Corrigir retorno de `updateStatus`.
5. Corrigir resources inconsistentes.

**Aceite**

- Nenhum erro fatal no fluxo básico de auth/create/task-status.

---

## Fase 3 — Integração Lifecycle MVP (D1-D3)

1. Garantir fluxo assíncrono mínimo:
   - `agent.create.requested` -> factory -> `agent.create.completed`
2. Implementar tracking de operação:
   - `agent_operations` + endpoint de consulta por `operation_id`.
3. Padronizar erros HTTP (`422/404/409/500`).

**Aceite**

- Cliente HTTP cria agente e acompanha operação sem acessar RabbitMQ diretamente.

---

## Fase 4 — Observabilidade e Operação (D3-D4)

1. Logs estruturados obrigatórios:
   - `agent_id`, `user_id`, `operation_id`, `event_name`, `generation`.
2. Runbook MVP atualizado:
   - operação travada
   - falha de registro
   - falha de ativação
3. Smoke E2E local automatizado.

**Aceite**

- Operação reproduzível e recuperável com runbook.

---

## Fase 5 — Cutover Formal (D5)

1. Anunciar cutover concluído.
2. Marcar repo antigo como read-only para API/docs/contracts.
3. Atualizar documentação principal apontando este repo como autoridade.

**Aceite**

- Não há mais PRs de evolução da API no repo antigo.

---

## Critérios Go/No-Go

## Go

- API sobe e migra localmente.
- P0/P1 resolvidos.
- Fluxo create assíncrono validado por smoke.
- Tracking por `operation_id` funcionando.

## No-Go

- Falha de migração de DB sem workaround.
- Fluxo create incompleto ou não idempotente.
- Contratos v1 divergentes entre producer/consumer.

---

## Rollback Plan

1. Reverter branch de cutover.
2. Restaurar execução da API no repo antigo temporariamente.
3. Reabrir janela de correção com lista explícita de bloqueios.

Regra: rollback só é aceito se houver falha de critérios Go.

---

## Governança de mudanças durante cutover

- Toda mudança de evento exige no mesmo PR:
  1. schema
  2. exemplo
  3. teste
  4. doc
- Sem breaking change em `v1` durante cutover.
- Se quebrar contrato, abrir `v2` explicitamente.

---

## Backlog de execução

Executar em conjunto com:

- `docs/pantheon/mvp-backlog-2-weeks.md`
- `docs/pantheon/api-reuse-audit-checklist.md`
