# Pantheon API (Control Plane)

## 1. Purpose & Authority
The Pantheon API serves as the **authoritative Control Plane** for the entire ecosystem. It is the single source of truth for the agent registry, task lifecycle states, and the system-wide audit trail. All other components, including the Dashboard and Execution Core, must synchronize their state and behavior against this service.

## 2. Responsibilities of the Control Plane
The API is responsible for the following core functions:
*   **Agent Management**: Registration, authentication, and heartbeat monitoring of all agents.
*   **Task Orchestration**: Enforcement of the official state machine and task transitions.
*   **Audit Persistence**: Immutable recording of all agent actions and system events.
*   **Topology Provisioning**: Definition and setup of the RabbitMQ messaging structure.
*   **Real-time Signaling**: Broadcasting of state changes through Redis for UI/UX synchronization.

## 3. Technology Stack
*   **Framework**: Laravel 12.x (PHP 8.4+)
*   **Database**: PostgreSQL 16+ (Relational Persistence)
*   **Queue/Bus**: RabbitMQ 3.x (IATP v3.1 Transport)
*   **Cache/Signals**: Redis 7.x
*   **Containerization**: Docker + Docker Compose

## 4. Local Development & Execution
To run the API service locally:
1.  **Environment Setup**: Ensure a valid `.env` file is present in the `api/` directory.
2.  **Container Launch**: Use the root Orchestrator to launch the service: `docker compose up -d api`.
3.  **Dependencies**: The API requires PostgreSQL and RabbitMQ to be in a healthy state.
4.  **Configuration**: RabbitMQ credentials and endpoints are managed via `config/rabbitmq.php`.

> [!IMPORTANT]
> **Container-Only Execution**: This service is designed to run exclusively within Docker. No PHP, Composer, or Node.js runtimes are required or supported on the host machine. All administrative and development commands (e.g., `php artisan`, `composer install`) MUST be executed inside the `cp-api` container.

## 5. Messaging & Infrastructure Dependencies
The API service acts as the **Topology Authority**. It is responsible for creating the necessary Exchanges, Queues, and VHosts required for the Inter-Agent Task Protocol (IATP). 

Running `php artisan rabbitmq:setup` **inside the API container** will provision the infrastructure according to the authoritative contract.

## 6. Documentation Map
For detailed technical specifications, refer to the following authoritative documents:
*   **[TASK_LIFECYCLE.md](./docs/TASK_LIFECYCLE.md)**: The definitive Task State Machine (Normative).
*   **[RABBITMQ_TOPOLOGY.md](./docs/RABBITMQ_TOPOLOGY.md)**: The authoritative messaging contract.
*   **[DATA_MODEL.md](./docs/DATA_MODEL.md)**: Database schemas and relationship invariants.
*   **[AUTH.md](./docs/AUTH.md)**: JWT implementation and RBAC policies.

## 7. Operational Warnings (Normative)
The architecture of this service is governed by strict stability requirements.
*   **Normative Constraints**: `api/docs/TASK_LIFECYCLE.md` is a **HIGH-risk normative artifact**. Any modification to the state machine or task transitions REQUIRES a formal ADR and human review.
*   **Authorized Changes ONLY**: Unauthorized modifications to the database schema, RabbitMQ topology, or lifecycle logic are strictly prohibited.
*   **Contract Supremacy**: All implementation changes must strictly adhere to the [Inter-Service Contracts](../docs/api/liquid_state_api.yaml).
*   **Security Integrity**: Hardcoded credentials or bypasses of the `config/rabbitmq.php` layer are governance violations.
