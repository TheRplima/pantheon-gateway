# Pantheon Backlog de Evolução

## Objetivo

Registrar ideias de evolução arquitetural para próximas versões, sem alterar o escopo da implementação atual.

---

## 1) Evolução de Templates (pacote + arquivos)

### Contexto atual

- Hoje o template é tratado como pacote/versionamento único (`agent_template`).
- Funciona para provisioning assíncrono, mas limita operações granulares por arquivo.

### Proposta (vNext)

Adicionar modelagem em dois níveis:

1. **Template Package**
- Identidade do template (`template_key`, `template_version`, `schema_version`, status).
- Metadados de publicação e checksum do pacote.

2. **Template Files**
- Registro por arquivo (path relativo, conteúdo, hash, tipo, flags de proteção).
- Versionado por pacote para reprodução determinística.

### Benefícios

- Auditoria e diff por arquivo.
- Edição granular via API.
- Validação estrutural (arquivos obrigatórios, placeholders, role markers) antes de publicar.
- Pipeline assíncrono de build/publicação de pacote.

### Fluxo assíncrono sugerido

1. API recebe alteração de template.
2. Publica evento de build (`template.build.requested`).
3. Worker monta pacote (materialização dos arquivos + validações).
4. Publica resultado (`template.built` / `template.failed`).
5. API promove status do pacote (`draft` -> `active`) se aprovado.

### Critérios de aceite (vNext)

- Possível versionar template sem sobrescrever versões existentes.
- Possível consultar histórico de mudanças por arquivo.
- Package ativo sempre reproduzível por checksum.
- Validação bloqueia publicação com inconsistências.

---

## 2) Evolução de Models de Agente (modelo + artefatos)

### Contexto atual

- `agent_model` guarda versão e configuração normalizada.
- Ainda não há detalhamento opcional por artefato/campo com governança fina.

### Proposta (vNext)

Adicionar modelagem complementar:

1. **Agent Model (head)**
- `model_key`, `model_version`, `model_type`, compatibilidade com template.

2. **Model Artifacts / Components**
- Blocos versionados (identity, soul, governance, decision, io, onboarding, context).
- Manifest de artefatos extras (`decision.manifest[]`) explicitado e validado.

### Benefícios

- Reuso de blocos entre modelos.
- Evolução incremental de governança/regras sem clonar YAML inteiro.
- Auditoria semântica de mudanças (ex.: alteração só em gates/rules).
- Melhor suporte para overrides por agente.

### Fluxo assíncrono sugerido

1. API recebe criação/edição de model.
2. Worker valida compatibilidade (`model_type`, `compatible_template`, schema).
3. Worker gera snapshot canônico + checksum.
4. API registra versão imutável e promove status.

### Critérios de aceite (vNext)

- API consegue validar modelo contra template alvo antes de ativar.
- Snapshot do modelo é imutável por versão.
- Alterações em blocos geram nova versão com trilha auditável.
- Factory recebe payload determinístico (snapshot + checksum).

---

## 3) Dependências de Design para vNext

- Definir estratégia de storage de conteúdo (DB vs object storage + referência).
- Definir limites de tamanho para conteúdo por arquivo/bloco.
- Definir política de migração de versões antigas.
- Definir política de rollback por pacote/model version.

---

## 4) Fora de escopo da versão atual

- CRUD granular de arquivos de template.
- CRUD granular de blocos de model com DAG de dependências.
- Pipeline de promoção (draft -> active) para templates/models.
- Migração automática de agentes existentes entre versões.
