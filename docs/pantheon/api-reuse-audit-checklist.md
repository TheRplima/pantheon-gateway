# Pantheon API Reuse Audit (Laravel) — Checklist de Patch

## Escopo auditado

- Código em `~/projects/pantheon/api`
- Foco: viabilidade de reuso no MVP deste repositório (create agent via API + fluxo event-driven simples)

## Veredito

**Reaproveitável como base, mas não plug-and-play.**

Estado atual: **MVP parcial** com boas fundações (Laravel 12, JWT, modelos/migrations de tasks), porém com bloqueios funcionais que precisam ser corrigidos antes de uso em produção do MVP.

## Status de viabilidade

- **Pode ser usado**: sim, após patch set curto de hardening.
- **Pode ser usado agora sem ajuste**: não.

---

## Findings (priorizados)

## P0 — Bloqueadores de funcionamento

1. **Auth quebra em runtime por método ausente no repositório**

- `~/projects/pantheon/api/app/Services/AgentAuthService.php:20`
- `~/projects/pantheon/api/app/Repositories/AgentRepository.php:7`
- Problema: `findActiveById()` é chamado, mas não existe em `AgentRepository`.
- Impacto: login/auth de agente pode falhar por erro fatal.

2. **Criação de agente publica evento inconsistente com payload esperado**

- `~/projects/pantheon/api/app/Http/Controllers/Api/v1/AgentController.php:40`
- `~/projects/pantheon/api/app/Services/WakeUpPublisher.php:40`
- Problema: controller passa `agent->id` para um publisher modelado como `taskId`.
- Impacto: roteamento e payload incorretos; fluxo de provisionamento não confiável.

3. **Bypass de autenticação por rota duplicada pública**

- `~/projects/pantheon/api/routes/api.php:18`
- `~/projects/pantheon/api/routes/api.php:36`
- Problema: `POST /v1/tasks` existe público e autenticado; a rota pública tende a capturar.
- Impacto: criação de task sem guard `auth:api`; `Auth::guard('api')->id()` retorna `null`.

4. **Retorno incorreto de updateStatus**

- `~/projects/pantheon/api/app/Repositories/TaskRepository.php:35`
- `~/projects/pantheon/api/app/Services/TaskService.php:62`
- Problema: `updateStatus()` retorna boolean (`update`) e camada superior trata como `Task`.
- Impacto: resposta inválida na API e possível erro no `TaskResource`.

## P1 — Quebras de contrato/serialização

5. **Resource de assinatura usa campos inexistentes**

- `~/projects/pantheon/api/app/Http/Resources/v1/TaskSignatureResource.php:14`
- `~/projects/pantheon/api/app/Models/TaskSignature.php:10`
- Problema: resource usa `agent_id` e `signed_at`, mas modelo usa `signer_agent` e `created_at`.
- Impacto: payload inconsistente/erro de serialização.

6. **TaskResource referencia relation não definida**

- `~/projects/pantheon/api/app/Http/Resources/v1/TaskResource.php:37`
- `~/projects/pantheon/api/app/Models/Task.php:10`
- Problema: `logs` é serializado, mas `Task` não define relation `logs()`.
- Impacto: inconsistência do contrato e risco de erro ao eager-load.

7. **Inconsistência de env var RabbitMQ**

- `~/projects/pantheon/api/app/Services/WakeUpPublisher.php:19`
- `~/projects/pantheon/api/config/rabbitmq.php:6`
- Problema: publisher usa `RABBITMQ_PASSWORD`; config padrão usa `RABBITMQ_PASS`.
- Impacto: configuração ambígua e chance de falha de conexão em ambientes diferentes.

## P2 — Débito técnico para fase seguinte

8. **Governança de transição ainda não implementada**

- `~/projects/pantheon/api/app/Services/TaskService.php:60`
- Problema: TODO em validação de transições.
- Impacto: state machine permissiva além do desejado no v3.1.

9. **Publisher orientado a WAKE_UP de task, não lifecycle de agente**

- `~/projects/pantheon/api/app/Services/WakeUpPublisher.php:47`
- Problema: modelagem atual está mais próxima de IATP task/wakeup do que lifecycle create/register/activate.
- Impacto: precisa adaptação para contratos lifecycle `v1` deste repositório.

---

## Checklist de patch (ordem recomendada)

## Fase A — Tornar a API utilizável (P0)

- [ ] Implementar `AgentRepository::findActiveById(string $id)`.
- [ ] Remover duplicidade de rota `POST /v1/tasks` pública; manter versão autenticada.
- [ ] Corrigir `TaskRepository::updateStatus()` para retornar `Task` atualizado (refresh).
- [ ] Corrigir `AgentController::store()` para emitir evento correto de lifecycle (ou remover publish temporariamente e delegar ao worker próprio).

## Fase B — Corrigir contratos HTTP (P1)

- [ ] Corrigir `TaskSignatureResource` para `signer_agent` + `created_at`.
- [ ] Adicionar relation `logs()` em `Task` **ou** remover `logs` de `TaskResource` até implementação.
- [ ] Unificar variável de senha RabbitMQ (`RABBITMQ_PASS` vs `RABBITMQ_PASSWORD`) e padronizar docs/env.

## Fase C — Alinhar ao MVP deste repositório

- [ ] Introduzir endpoint de acompanhamento de operação (`GET /v1/agent-operations/{operation_id}`).
- [ ] Persistir operações de lifecycle (`agent_operations`) com `operation_id`, `state`, `error`.
- [ ] Adapter de publish para contratos `packages/contracts/schemas/v1/*` (`agent.create.requested`, etc).

---

## Matriz “reusar vs reescrever”

- **Reusar agora**
  - Estrutura Laravel base (routing, requests, resources)
  - Migrations core de agent/task
  - JWT guard para agentes
- **Adaptar**
  - Publisher/event model para lifecycle `v1`
  - Surface HTTP para operation tracking
  - Regras de transição mínimas do MVP
- **Adiar**
  - Governança completa (gates/assinaturas complexas)
  - State machine v3.1 completa com todas invariantes

---

## Testes mínimos de validação (após patch)

1. **Auth**

- Login com agente ativo retorna JWT.
- Login com agente inativo retorna 401.

2. **Tasks**

- `POST /v1/tasks` sem token: 401.
- `POST /v1/tasks` com token válido: cria task com `requester_agent` correto.
- `PATCH /v1/tasks/{id}/status`: retorna `TaskResource` válido.

3. **Create lifecycle (MVP)**

- Criar agente via API gera `operation_id`.
- Publish de `agent.create.requested` ocorre com schema v1 válido.
- Callback de `agent.create.completed` atualiza estado da operação para `ready`.

4. **Serialização**

- `TaskResource` e `TaskSignatureResource` sem campos inexistentes.

---

## Estimativa de esforço (hardening inicial)

- P0: 0.5 a 1 dia
- P1: 0.5 dia
- C (operation tracking + adapter lifecycle v1): 1 a 2 dias

Total inicial: **2 a 3.5 dias** para API reutilizável no MVP.
