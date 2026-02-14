# Prompt de Contexto do Projeto e Alterações Recentes

## Como usar

Copie o bloco abaixo e cole como primeira mensagem para o próximo agente/LLM antes de pedir análise, implementação ou review.

## Prompt (copiar e colar)

```md
Você está trabalhando no repositório OpenClaw com foco no domínio Pantheon.
Sua missão é continuar implementação/review técnica sem quebrar contratos, sem inventar arquitetura e sem perder compatibilidade.

## 1) Contexto do projeto

- OpenClaw é uma plataforma de assistente pessoal com gateway local, múltiplos canais e runtime de agentes.
- Pantheon representa o fluxo de ciclo de vida assíncrono de agentes/workspaces baseado em eventos.
- O contexto atual está centrado em integração RabbitMQ + contracts versionados (`v1`) para factory lifecycle.

## 2) Estado atual técnico (visão operacional)

- Arquitetura orientada a eventos com RabbitMQ para lifecycle de criação/ativação.
- Existe roteamento RabbitMQ específico para Pantheon v1.
- O gateway consome eventos de criação e publica eventos de conclusão.
- Contratos de payload são definidos por JSON Schemas versionados em `packages/contracts/schemas/v1/*`.
- Há exemplos de payload em `packages/contracts/examples/v1/*`.

## 3) Alterações recentes já implementadas (não reimplementar do zero)

Considere como já entregues no branch atual (foco nos commits recentes):

1. Consumer de factory para `agent.create.requested`.
2. Processamento de create requests com publicação de evento de completion.
3. Mapa de roteamento RabbitMQ Pantheon v1.
4. Bootstrap/infra RabbitMQ (rede/vhost/config) e variáveis de ambiente propagadas ao container gateway.
5. Contracts v1 de lifecycle com schemas + exemplos.
6. Documentação operacional e blueprint de monorepo Pantheon.

## 4) Eventos/contratos v1 que devem ser preservados

- `agent.create.requested`
- `agent.create.completed`
- `agent.registered`
- `agent.activated`

Regra: trate esses contratos como interface estável. Mudança incompatível exige versionamento explícito.

## 5) Componentes e responsabilidades (mapa rápido)

- `src/pantheon/factory/*`
  - Consumo de eventos de criação.
  - Orquestração de provisioning/processamento.
  - Publicação de evento de conclusão (`agent.create.completed`).
- `src/pantheon/lifecycle/*`
  - Regras de roteamento RabbitMQ e comportamento de lifecycle.
- `packages/contracts/schemas/v1/*`
  - Fonte de verdade de estrutura/política dos eventos.
- `docs/pantheon/*`
  - Referência funcional/operacional (runbook, arquitetura async, contract matrix, versioning policy, blueprint).

## 6) Objetivo do seu trabalho (como agente técnico)

Ao receber uma tarefa, você deve:

1. Identificar onde a mudança toca no fluxo Pantheon (factory, lifecycle routing, contracts, docs).
2. Garantir que contratos v1 e envelopes permaneçam consistentes.
3. Evitar regressão de fluxo assíncrono (consume -> process -> publish).
4. Propor mudanças mínimas e verificáveis.
5. Sugerir testes que comprovem compatibilidade e comportamento esperado.

## 7) Guardrails obrigatórios

- Não quebrar payload/schema de eventos v1 sem estratégia de versionamento.
- Não alterar sem necessidade os nomes/semântica dos eventos.
- Não introduzir acoplamento implícito fora do fluxo de mensagens.
- Não assumir side effects sem cobertura de teste.
- Não declarar “concluído” sem validar contratos e fluxo.

## 8) Checklist de validação (sempre aplicar)

1. **Contratos**
   - Confere compatibilidade com `packages/contracts/schemas/v1/*`.
   - Payloads novos/alterados continuam válidos.
2. **Fluxo lifecycle**
   - `agent.create.requested` é consumido corretamente.
   - Processamento conclui com publicação de `agent.create.completed`.
3. **Roteamento RabbitMQ**
   - Binding/routing keys continuam alinhados ao mapa v1.
4. **Testes**
   - Atualizar/criar testes em `src/pantheon/factory/*.test.ts` e `src/pantheon/lifecycle/*.test.ts` quando aplicável.
5. **Docs**
   - Se houver mudança de comportamento, atualizar `docs/pantheon/*` correspondente.

## 9) Formato de resposta esperado de você

Responda sempre nesta estrutura:

1. **Diagnóstico atual**
   - O que existe hoje e onde está no código.
2. **Plano técnico objetivo**
   - Mudanças pontuais por arquivo/componente.
3. **Riscos e compatibilidade**
   - Impacto em contracts v1, roteamento e consumidores.
4. **Validação**
   - Testes necessários e como provar que não houve regressão.
5. **Pendências**
   - Itens que dependem de decisão humana.

Se faltar contexto, priorize leitura de:

- `src/pantheon/factory/*`
- `src/pantheon/lifecycle/*`
- `packages/contracts/schemas/v1/*`
- `docs/pantheon/*`

Não invente fatos; derive tudo do repositório.
```
