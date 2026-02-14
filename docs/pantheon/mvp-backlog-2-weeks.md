# Pantheon MVP Backlog (2 Weeks)

## Objetivo

Entregar um MVP funcional e verificável de criação de agentes via API/event-driven, com fluxo simples e estável:

`agent.create.requested` -> factory provisiona workspace -> `agent.create.completed` -> registro/ativação básica.

Referência de viabilidade da API Laravel existente:

- `docs/pantheon/api-reuse-audit-checklist.md`

## Princípios

- Priorizar fluxo ponta-a-ponta funcionando antes de governança avançada.
- Mudanças pequenas, reversíveis e com teste.
- Não introduzir breaking changes em contratos `v1`.

## Definition of Done (global)

- Contratos `packages/contracts/schemas/v1/*` válidos e cobertos por testes.
- Fluxo assíncrono com idempotência por `operation_id`.
- Logs com `agent_id`, `user_id`, `operation_id`, `event_name`, `generation`.
- Documentação atualizada em `docs/pantheon/*` quando houver mudança de comportamento.

---

## Semana 1 — MVP-1 (Create Flow Estável)

### PANTH-MVP-001 — Estado mínimo de operação no API

**Escopo**

- Persistir operação com estados mínimos: `pending`, `provisioning`, `ready`, `error`.
- Registrar `failed_step`, `error_code`, `error_message`.

**Aceite**

- Toda criação gera um registro de operação.
- Erros de factory resultam em `error` com causa estruturada.

### PANTH-MVP-002 — Idempotência de create por `operation_id`

**Escopo**

- Reprocessamento da mesma operação não duplica side effects.
- Se receber evento duplicado, responder com resultado já conhecido.

**Aceite**

- Teste de evento duplicado confirma zero duplicidade de workspace e zero duplicidade de publicação final.

### PANTH-MVP-003 — Guardas de `generation` (stale event)

**Escopo**

- Ignorar eventos com `generation` menor que a geração atual do agente.

**Aceite**

- Teste de out-of-order demonstra rejeição determinística de evento stale.

### PANTH-MVP-004 — Hardening do consumer factory

**Escopo**

- Melhorar classificação de erro (validação payload, provisionamento, publish callback).
- Garantir logging estruturado consistente.

**Aceite**

- Logs permitem rastrear uma operação completa apenas por `operation_id`.

### PANTH-MVP-005 — E2E smoke automatizado local

**Escopo**

- Script/teste de smoke: publica `agent.create.requested`, valida workspace criado e recebimento de `agent.create.completed`.

**Aceite**

- Smoke executa em ambiente local com resultado pass/fail claro.

### PANTH-MVP-011 — API Surface MVP (HTTP) explícita

**Escopo**

- Definir e implementar endpoints mínimos para o fluxo de criação:
  - `POST /api/v1/agents` (cria operação de provisionamento)
  - `GET /api/v1/agents/{id}` (estado atual do agente)
  - `GET /api/v1/agent-operations/{operation_id}` (estado da operação)
- Padronizar resposta com `operation_id`, `state`, `error` (quando houver).

**Aceite**

- Cliente HTTP consegue iniciar criação e acompanhar progresso sem acessar RabbitMQ/DB diretamente.

### PANTH-MVP-012 — Contratos HTTP e erros padronizados

**Escopo**

- Definir contrato de erros para API MVP:
  - `400/422` payload inválido
  - `404` recurso inexistente
  - `409` operação duplicada/conflito de geração
  - `500` falha interna
- Atualizar documentação de API no repositório.

**Aceite**

- Todos endpoints MVP retornam erros consistentes e documentados.

### PANTH-MVP-013 — Ajustes críticos da API existente (reuso viável)

**Escopo**

- Corrigir inconsistências funcionais detectadas na API Laravel de origem:
  - `AgentAuthService` depende de método ausente no repositório (`findActiveById`).
  - `AgentController::store` envia evento com argumento incompatível ao publisher.
  - Rotas públicas de `tasks` conflitam com uso obrigatório de auth.
  - `TaskRepository::updateStatus` deve retornar `Task` (hoje retorna bool).
  - Resources com campos/relations inconsistentes com modelos (`TaskSignatureResource`, `TaskResource`).

**Aceite**

- Fluxo API básico passa sem erro de runtime para create/read/status e tasks autenticadas.

---

## Semana 2 — MVP-2 (Registro e Ativação Simples)

### PANTH-MVP-006 — `agent.registered` (runtime register básico)

**Escopo**

- Consumir `agent.create.completed` no worker/runtime.
- Atualizar configuração runtime de forma atômica.
- Publicar `agent.registered`.

**Aceite**

- Após create completed, agente aparece no runtime config com consistência.

### PANTH-MVP-007 — `agent.activated` (ativação + healthcheck básico)

**Escopo**

- Trigger simples de reload/restart do gateway.
- Healthcheck mínimo pós-ativação.
- Publicar `agent.activated` em sucesso; `agent.failed` em falha.

**Aceite**

- Fluxo completo chega em `activated` quando saudável.
- Falha de healthcheck vai para `failed` com erro estruturado.

### PANTH-MVP-008 — Retry simples + DLQ policy mínima

**Escopo**

- Definir política mínima: N tentativas com backoff, depois DLQ.
- Documentar claramente o que é replayável.

**Aceite**

- Falha transitória é recuperada por retry.
- Falha persistente é roteada para DLQ com motivo.

### PANTH-MVP-009 — Runbook operacional MVP

**Escopo**

- Procedimento para: operação travada, erro de registro runtime, falha de ativação.
- Comandos/checks objetivos.

**Aceite**

- Operador consegue executar recuperação sem conhecimento implícito.

### PANTH-MVP-010 — Congelamento de escopo + checklist de release MVP

**Escopo**

- Checklist final de pronto para demonstração.
- Lista explícita do que ficou de fora (governança avançada, orquestrador completo, gates de assinatura).

**Aceite**

- MVP demonstrável ponta-a-ponta e backlog de fase seguinte definido.

### PANTH-MVP-014 — Migrations mínimas de operações de agente

**Escopo**

- Introduzir (ou adaptar) tabelas mínimas para estado de lifecycle no API:
  - `agents` (estado atual e geração)
  - `agent_operations` (rastreio por `operation_id`)
  - `agent_lifecycle_events` (auditoria de eventos)
- Índices por `operation_id`, `agent_id`, `state`, `created_at`.

**Aceite**

- Acompanhamento de operação não depende de inspeção manual de logs.

---

## Fora do escopo (agora)

- State machine completa de tasks v3.1.
- Cadeia de assinatura/validação multiagente.
- Governança soberana completa.
- Orquestrador Nexus com política rica.

## Próxima fase (após MVP)

1. Introduzir invariantes de governança no banco, começando pelos críticos.
2. Evoluir orquestrador (Nexus) como autoridade de delegação.
3. Expandir contratos/eventos sem quebrar compatibilidade `v1`.
