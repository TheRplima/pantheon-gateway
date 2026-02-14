# Pantheon Cutover — Checklist Operacional (D0-D5)

Referência principal:

- `docs/pantheon/cutover-plan.md`

## Papéis (sugestão)

- `API`: responsável por Laravel/API/migrations.
- `GW`: responsável por gateway/factory/lifecycle consumer.
- `OPS`: responsável por Docker/RabbitMQ/execução operacional.
- `DOC`: responsável por documentação e critérios de aceite.

---

## D0 — Importação e bootstrap

1. [ ] Criar branch de cutover (`cutover/pantheon-api-import`)  
        Owner: `API` | ETA: 15m  
        Evidência: branch criada e compartilhada.

2. [x] Importar API para `apps/api`  
        Owner: `API` | ETA: 1h  
        Evidência: código importado de `~/projects/pantheon/api` para `apps/api` + `apps/api/README-MIGRATION.md`.

3. [x] Ajustar env/compose para subir API no novo path  
        Owner: `OPS` | ETA: 1h  
        Evidência: `apps/api/.env` e `apps/api/docker-compose.yml` criados; stack sobe com `docker compose -p pantheon-gateway-api -f apps/api/docker-compose.yml up -d`.

4. [x] Rodar migrations no novo contexto  
        Owner: `API` | ETA: 30m  
        Evidência: `php artisan migrate --force` executado com sucesso no container `pgw-cp-api`.

Go/No-Go D0:

- Go se API sobe + migrations ok.
- No-Go se ambiente não sobe de forma determinística.

---

## D1 — Hardening P0

1. [x] Corrigir `findActiveById` no repositório de agentes  
        Owner: `API` | ETA: 30m  
        Evidência: método `findActiveById` implementado em `apps/api/app/Repositories/AgentRepository.php`.

2. [x] Corrigir publish inconsistente no `AgentController::store`  
        Owner: `API` | ETA: 45m  
        Evidência: publish de WAKE_UP removido do `store` em `apps/api/app/Http/Controllers/Api/v1/AgentController.php` para evitar semântica incorreta de task.

3. [x] Remover conflito de rota pública x protegida de tasks  
        Owner: `API` | ETA: 30m  
        Evidência: rota pública `POST /v1/tasks` removida; existe apenas a rota protegida em `apps/api/routes/api.php`.

4. [x] Corrigir retorno de `updateStatus` para retornar Task  
        Owner: `API` | ETA: 30m  
        Evidência: `updateStatus` agora retorna `Task` atualizado (`fresh`) em `apps/api/app/Repositories/TaskRepository.php`.

Go/No-Go D1:

- Go se todos P0 passam em teste manual + teste automatizado básico.
- No-Go se ainda houver erro fatal de auth/rota/status.

---

## D2 — Hardening P1 + contratos HTTP MVP

1. [ ] Corrigir `TaskSignatureResource` (campos reais)  
        Owner: `API` | ETA: 30m  
        Evidência: payload de assinatura consistente com DB/model.

2. [ ] Corrigir `TaskResource` relation `logs` (adicionar relation ou remover campo)  
        Owner: `API` | ETA: 30m  
        Evidência: serialização de task sem warnings/erros.

3. [ ] Padronizar erros HTTP (`422/404/409/500`)  
        Owner: `API` | ETA: 1h  
        Evidência: respostas de erro consistentes e documentadas.

4. [ ] Definir surface mínima de operação (`POST agents`, `GET agents/{id}`, `GET operations/{id}`)  
        Owner: `API` | ETA: 1h30  
        Evidência: endpoints funcionais com contrato estável.

Go/No-Go D2:

- Go se API já é consumível por cliente sem RabbitMQ direto.

---

## D3 — Integração assíncrona MVP

1. [ ] Integrar callback de `agent.create.completed` para atualizar operação  
        Owner: `GW` + `API` | ETA: 1h30  
        Evidência: operação muda para `ready` após callback.

2. [ ] Garantir idempotência por `operation_id`  
        Owner: `GW` + `API` | ETA: 1h  
        Evidência: replay não duplica side effects.

3. [ ] Garantir proteção de `generation` (stale ignore)  
        Owner: `GW` + `API` | ETA: 1h  
        Evidência: evento stale rejeitado com log explícito.

4. [ ] Validar schemas `v1` no fluxo de ponta a ponta  
        Owner: `GW` | ETA: 45m  
        Evidência: validação ok nos envelopes de entrada/saída.

Go/No-Go D3:

- Go se create async ponta-a-ponta está estável.

---

## D4 — Operação e observabilidade

1. [ ] Padronizar logs estruturados obrigatórios  
        Owner: `GW` + `API` | ETA: 1h  
        Evidência: logs com `operation_id`, `agent_id`, `event_name`, `generation`.

2. [ ] Atualizar runbook operacional MVP  
        Owner: `DOC` + `OPS` | ETA: 1h  
        Evidência: procedimentos de recovery documentados.

3. [ ] Implementar smoke E2E automatizado local  
        Owner: `GW` + `OPS` | ETA: 1h30  
        Evidência: comando único pass/fail para fluxo create.

Go/No-Go D4:

- Go se operação é rastreável e recuperável.

---

## D5 — Cutover formal

1. [ ] Marcar este repo como source of truth oficial (API/contracts/docs)  
        Owner: `DOC` | ETA: 30m  
        Evidência: documentação principal atualizada.

2. [ ] Congelar evolução da API no repo antigo (read-only para esse domínio)  
        Owner: `OPS` | ETA: 30m  
        Evidência: comunicado + política registrada.

3. [ ] Fechar checklist de aceite final  
        Owner: `API` + `GW` + `OPS` + `DOC` | ETA: 45m  
        Evidência: todos critérios de Go atendidos.

Go/No-Go D5:

- Go se critérios finais completos e smoke verde.
- No-Go aciona rollback de `docs/pantheon/cutover-plan.md`.

---

## Critérios finais de aceite (resumo)

1. [ ] API importada e estável em `apps/api`.
2. [ ] P0/P1 da auditoria resolvidos.
3. [ ] Fluxo `agent.create.requested -> agent.create.completed` validado.
4. [ ] Tracking de operação por `operation_id` disponível.
5. [ ] Logs e runbook operacionais prontos.
6. [ ] Source of truth oficialmente consolidado neste repositório.
