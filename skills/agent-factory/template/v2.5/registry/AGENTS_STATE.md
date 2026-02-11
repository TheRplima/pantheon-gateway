# AGENTS_STATE.md — Systemic Operational Status

<!-- :::meta
template_version: v2.5
marker_schema: v1.0
::: -->

> [!NOTE]
> Este dashboard reflete o estado operacional de todos os agentes sob supervisão do **{{AGENT_NAME}}**.
> Atualizado via heartbeat ou mudanças de estado significativas.

**Última Atualização:** {{DATE}} {{TIME}}

---

## 🟢 Agentes em Operação

| Agente | Tipo | Domínio | Status | Último Heartbeat |
| :--- | :--- | :--- | :--- | :--- |
| operator | ENTRY | System | active | - |
{{AGENT_STATE_ROWS}}

---

## 🛠️ Tarefas Ativas (In-Flight)

| Task ID | Título | Responsável | Status | Início |
| :--- | :--- | :--- | :--- | :--- |
| - | - | - | - | - |

---

## 🚨 Alertas e Incidentes

| Nível | Mensagem | Agente | Ação Exigida |
| :--- | :--- | :--- | :--- |
| - | - | - | - |

---

## 📊 Resumo de Saúde

| Métrica | Valor |
| :--- | :--- |
| Total de Task Containers | 0 |
| Latência Média IATP | - |
| Violações de Governança | 0 |
