#!/usr/bin/env python3
"""Pantheon RabbitMQ wake-up consumer.

Producer compatibility note:
- Producers should publish with `delivery_mode=2` (persistent messages).
- This consumer declares a durable topic exchange and durable queue.
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass
from typing import Any

import pika
from cachetools import TTLCache
from pika.adapters.blocking_connection import BlockingChannel
from pika.exceptions import AMQPConnectionError


LOGGER = logging.getLogger("pantheon_consumer")
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(message)s",
)


@dataclass(frozen=True)
class Config:
    rabbitmq_host: str
    rabbitmq_port: int
    rabbitmq_user: str
    rabbitmq_pass: str
    rabbitmq_vhost: str
    rabbitmq_exchange: str
    agent_id: str
    queue_name: str
    seen_ttl_seconds: int


SEEN_CACHE: TTLCache[str, bool] | None = None


def log_event(event: str, **fields: Any) -> None:
    payload = {"event": event, **fields}
    LOGGER.info(json.dumps(payload, sort_keys=True, default=str))


def require_env(name: str) -> str:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def load_config() -> Config:
    agent_id = require_env("AGENT_ID")
    queue_name = os.getenv("QUEUE_NAME", f"agent.{agent_id}.wakeup")

    return Config(
        rabbitmq_host=require_env("RABBITMQ_HOST"),
        rabbitmq_port=int(os.getenv("RABBITMQ_PORT", "5672")),
        rabbitmq_user=require_env("RABBITMQ_USER"),
        rabbitmq_pass=require_env("RABBITMQ_PASS"),
        rabbitmq_vhost=os.getenv("RABBITMQ_VHOST", "pantheon"),
        rabbitmq_exchange=os.getenv("RABBITMQ_EXCHANGE", "pantheon.iatp"),
        agent_id=agent_id,
        queue_name=queue_name,
        seen_ttl_seconds=int(os.getenv("SEEN_TTL_SECONDS", "86400")),
    )


def validate_message(message: dict[str, Any]) -> dict[str, Any]:
    required_fields = [
        "message_id",
        "correlation_id",
        "timestamp",
        "sender_id",
        "action",
        "payload",
    ]

    for field in required_fields:
        if field not in message:
            raise ValueError(f"Missing required field: {field}")

    if message["action"] != "WAKE_UP":
        raise ValueError("Invalid action: expected WAKE_UP")

    if not isinstance(message["payload"], dict):
        raise ValueError("payload must be an object")

    task_id = message["payload"].get("task_id")
    if not task_id:
        raise ValueError("payload.task_id is required")

    trace_chain = message.get("trace_chain")
    if trace_chain is not None:
        if not isinstance(trace_chain, list) or not all(
            isinstance(item, str) for item in trace_chain
        ):
            raise ValueError("trace_chain must be a list of strings")

    return message


def write_received_state(message: dict[str, Any]) -> None:
    """Persist the first state transition (received) for the task.

    Replace this stub with the real database write.
    """
    task_id = message["payload"]["task_id"]
    correlation_id = message["correlation_id"]
    log_event(
        "received_state_written",
        message_id=message["message_id"],
        correlation_id=correlation_id,
        task_id=task_id,
    )


def wake_agent(
    task_id: str,
    priority: Any,
    requires_attention: Any,
    correlation_id: str,
    sender_id: str,
) -> None:
    """Execute agent wake-up logic.

    Replace this stub with the actual wake-up implementation.
    """
    log_event(
        "wake_agent_called",
        task_id=task_id,
        priority=priority,
        requires_attention=requires_attention,
        correlation_id=correlation_id,
        sender_id=sender_id,
    )


def mark_seen(message_id: str) -> None:
    if SEEN_CACHE is None:
        raise RuntimeError("SEEN_CACHE not initialized")
    SEEN_CACHE[message_id] = True


def seen(message_id: str) -> bool:
    if SEEN_CACHE is None:
        raise RuntimeError("SEEN_CACHE not initialized")
    return bool(SEEN_CACHE.get(message_id))


def on_message(ch: BlockingChannel, method: Any, props: Any, body: bytes) -> None:
    start = time.monotonic()

    routing_key = getattr(method, "routing_key", None)

    try:
        msg = json.loads(body)
        if not isinstance(msg, dict):
            raise ValueError("Message body must be a JSON object")
        msg = validate_message(msg)
    except Exception as exc:
        ch.basic_ack(delivery_tag=method.delivery_tag)
        log_event(
            "invalid_schema",
            error=str(exc),
            routing_key=routing_key,
            processing_ms=round((time.monotonic() - start) * 1000, 2),
            result="invalid_schema",
        )
        return

    message_id = msg["message_id"]
    correlation_id = msg["correlation_id"]
    sender_id = msg["sender_id"]
    task_id = msg["payload"]["task_id"]

    if seen(message_id):
        ch.basic_ack(delivery_tag=method.delivery_tag)
        log_event(
            "duplicate_skipped",
            message_id=message_id,
            correlation_id=correlation_id,
            task_id=task_id,
            sender_id=sender_id,
            routing_key=routing_key,
            processing_ms=round((time.monotonic() - start) * 1000, 2),
            result="duplicate_skipped",
        )
        return

    try:
        # Step c) first durable state transition before side effects.
        write_received_state(msg)
    except Exception as exc:
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
        log_event(
            "nack_requeue",
            message_id=message_id,
            correlation_id=correlation_id,
            task_id=task_id,
            sender_id=sender_id,
            routing_key=routing_key,
            error=str(exc),
            processing_ms=round((time.monotonic() - start) * 1000, 2),
            result="nack_requeue",
        )
        return

    try:
        wake_agent(
            task_id=task_id,
            priority=msg["payload"].get("priority"),
            requires_attention=msg["payload"].get("requires_attention"),
            correlation_id=correlation_id,
            sender_id=sender_id,
        )
        mark_seen(message_id)
        ch.basic_ack(delivery_tag=method.delivery_tag)
        log_event(
            "processed",
            message_id=message_id,
            correlation_id=correlation_id,
            task_id=task_id,
            sender_id=sender_id,
            routing_key=routing_key,
            processing_ms=round((time.monotonic() - start) * 1000, 2),
            result="processed",
        )
    except Exception as exc:
        # We intentionally avoid requeue here after "received" is written,
        # because retrying blindly may duplicate side effects. Prefer DLQ/retry policy.
        ch.basic_ack(delivery_tag=method.delivery_tag)
        log_event(
            "post_received_failure_acknowledged",
            message_id=message_id,
            correlation_id=correlation_id,
            task_id=task_id,
            sender_id=sender_id,
            routing_key=routing_key,
            error=str(exc),
            processing_ms=round((time.monotonic() - start) * 1000, 2),
            result="processed_with_error_ack",
        )


def connect_and_consume(config: Config) -> None:
    credentials = pika.PlainCredentials(config.rabbitmq_user, config.rabbitmq_pass)
    parameters = pika.ConnectionParameters(
        host=config.rabbitmq_host,
        port=config.rabbitmq_port,
        virtual_host=config.rabbitmq_vhost,
        credentials=credentials,
    )

    backoff_seconds = 1
    max_backoff_seconds = 30

    while True:
        try:
            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()

            channel.exchange_declare(
                exchange=config.rabbitmq_exchange,
                exchange_type="topic",
                durable=True,
            )
            channel.queue_declare(queue=config.queue_name, durable=True)
            channel.queue_bind(
                queue=config.queue_name,
                exchange=config.rabbitmq_exchange,
                routing_key=f"agent.{config.agent_id}.wakeup",
            )
            channel.basic_qos(prefetch_count=1)

            channel.basic_consume(
                queue=config.queue_name,
                auto_ack=False,
                on_message_callback=on_message,
            )

            log_event(
                "consumer_started",
                exchange=config.rabbitmq_exchange,
                queue=config.queue_name,
                routing_key=f"agent.{config.agent_id}.wakeup",
                result="started",
            )

            backoff_seconds = 1
            channel.start_consuming()
        except AMQPConnectionError as exc:
            log_event(
                "connection_lost",
                error=str(exc),
                sleep_seconds=backoff_seconds,
                result="reconnecting",
            )
            time.sleep(backoff_seconds)
            backoff_seconds = min(backoff_seconds * 2, max_backoff_seconds)
        except KeyboardInterrupt:
            log_event("consumer_stopped", result="stopped")
            break


def main() -> None:
    global SEEN_CACHE

    config = load_config()
    SEEN_CACHE = TTLCache(maxsize=50000, ttl=config.seen_ttl_seconds)
    connect_and_consume(config)


if __name__ == "__main__":
    main()