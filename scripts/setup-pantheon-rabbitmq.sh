#!/usr/bin/env bash
set -euo pipefail

# Idempotent RabbitMQ bootstrap for Pantheon async lifecycle contracts.
# Requires RabbitMQ Management API enabled.

RABBITMQ_API_URL="${RABBITMQ_API_URL:-http://localhost:15672/api}"
RABBITMQ_USER="${RABBITMQ_USER:-guest}"
RABBITMQ_PASS="${RABBITMQ_PASS:-guest}"
RABBITMQ_VHOST="${RABBITMQ_VHOST:-/pantheon}"
RABBITMQ_PERM_USER="${RABBITMQ_PERM_USER:-$RABBITMQ_USER}"

LIFECYCLE_EXCHANGE="pantheon.agent.lifecycle"
DLX_EXCHANGE="pantheon.agent.dlx"
DLQ_NAME="q.agent.dlq"
DLQ_ROUTING_KEY="dead"

urlenc_vhost() {
  # We only need to support leading slash vhosts like /pantheon.
  local vhost="$1"
  printf '%s' "${vhost//\//%2F}"
}

api_put() {
  local path="$1"
  local body="${2:-{}}"
  curl -fsS -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
    -H 'content-type: application/json' \
    -X PUT "$RABBITMQ_API_URL$path" \
    -d "$body" >/dev/null
}

api_post() {
  local path="$1"
  local body="${2:-{}}"
  curl -fsS -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
    -H 'content-type: application/json' \
    -X POST "$RABBITMQ_API_URL$path" \
    -d "$body" >/dev/null
}

declare_exchange() {
  local encoded_vhost="$1"
  local exchange="$2"
  local type="$3"
  api_put "/exchanges/${encoded_vhost}/${exchange}" "{\"type\":\"${type}\",\"durable\":true,\"auto_delete\":false,\"internal\":false,\"arguments\":{}}"
}

declare_queue() {
  local encoded_vhost="$1"
  local queue="$2"
  local args_json="${3:-{}}"
  api_put "/queues/${encoded_vhost}/${queue}" "{\"durable\":true,\"auto_delete\":false,\"arguments\":${args_json}}"
}

bind_queue() {
  local encoded_vhost="$1"
  local exchange="$2"
  local queue="$3"
  local routing_key="$4"
  api_post "/bindings/${encoded_vhost}/e/${exchange}/q/${queue}" "{\"routing_key\":\"${routing_key}\",\"arguments\":{}}"
}

echo "[pantheon-rabbitmq] Configuring RabbitMQ at ${RABBITMQ_API_URL}"

ENCODED_VHOST="$(urlenc_vhost "$RABBITMQ_VHOST")"

# 1) Vhost + permissions
api_put "/vhosts/${ENCODED_VHOST}" '{}'
api_put "/permissions/${ENCODED_VHOST}/${RABBITMQ_PERM_USER}" '{"configure":".*","write":".*","read":".*"}'

# 2) Exchanges
declare_exchange "$ENCODED_VHOST" "$LIFECYCLE_EXCHANGE" topic
declare_exchange "$ENCODED_VHOST" "$DLX_EXCHANGE" direct

# 3) Queues (all operational queues dead-letter to pantheon.agent.dlx)
DL_ARGS="{\"x-dead-letter-exchange\":\"${DLX_EXCHANGE}\",\"x-dead-letter-routing-key\":\"${DLQ_ROUTING_KEY}\"}"
declare_queue "$ENCODED_VHOST" "q.agent.factory" "$DL_ARGS"
declare_queue "$ENCODED_VHOST" "q.agent.runtime" "$DL_ARGS"
declare_queue "$ENCODED_VHOST" "q.agent.workspace.move" "$DL_ARGS"
declare_queue "$ENCODED_VHOST" "q.agent.api.callback" "$DL_ARGS"

# Dedicated dead-letter queue
declare_queue "$ENCODED_VHOST" "$DLQ_NAME" '{}'

# 4) Bindings for lifecycle exchange
bind_queue "$ENCODED_VHOST" "$LIFECYCLE_EXCHANGE" "q.agent.factory" "agent.provision.requested"

bind_queue "$ENCODED_VHOST" "$LIFECYCLE_EXCHANGE" "q.agent.runtime" "agent.runtime.register.requested"
bind_queue "$ENCODED_VHOST" "$LIFECYCLE_EXCHANGE" "q.agent.runtime" "agent.activation.requested"
bind_queue "$ENCODED_VHOST" "$LIFECYCLE_EXCHANGE" "q.agent.runtime" "agent.deactivation.requested"

bind_queue "$ENCODED_VHOST" "$LIFECYCLE_EXCHANGE" "q.agent.workspace.move" "agent.activation.requested"
bind_queue "$ENCODED_VHOST" "$LIFECYCLE_EXCHANGE" "q.agent.workspace.move" "agent.deactivation.requested"

bind_queue "$ENCODED_VHOST" "$LIFECYCLE_EXCHANGE" "q.agent.api.callback" "agent.workspace.ready"
bind_queue "$ENCODED_VHOST" "$LIFECYCLE_EXCHANGE" "q.agent.api.callback" "agent.runtime.registered"
bind_queue "$ENCODED_VHOST" "$LIFECYCLE_EXCHANGE" "q.agent.api.callback" "agent.activated"
bind_queue "$ENCODED_VHOST" "$LIFECYCLE_EXCHANGE" "q.agent.api.callback" "agent.deactivated"
bind_queue "$ENCODED_VHOST" "$LIFECYCLE_EXCHANGE" "q.agent.api.callback" "agent.failed"

# 5) DLQ binding
bind_queue "$ENCODED_VHOST" "$DLX_EXCHANGE" "$DLQ_NAME" "$DLQ_ROUTING_KEY"

echo "[pantheon-rabbitmq] Done."
echo "[pantheon-rabbitmq] vhost=${RABBITMQ_VHOST} exchanges=${LIFECYCLE_EXCHANGE},${DLX_EXCHANGE}"
