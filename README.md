# HelpDesk AI

A multi-tenant helpdesk application that combines support tickets, real-time ticket chat, and company-specific AI answers. The backend is split into five Spring Boot services. RabbitMQ carries document processing, ticket-chat creation, and email work between them so those tasks do not block the main API request.

The repository also includes a Next.js frontend with separate employee, agent, and admin experiences.

## Architecture

![Architecture overview showing the frontend, five services, RabbitMQ exchanges, and data stores](Architecture%20overview.excalidraw.png)

The frontend calls the core API through a same-origin Next.js backend-for-frontend (BFF). Ticket chat has its own REST history endpoint and STOMP WebSocket connection. `raghelpdesk` and `ticketChatService` persist their data in MySQL; document files live in S3 and searchable chunks live in Qdrant.

### Services

| Service | Responsibility | Main integrations |
| --- | --- | --- |
| [`raghelpdesk`](raghelpdesk/) | Authentication, tenants, users, invitations, tickets, conversations, document administration, and RAG chat | MySQL, Qdrant, S3, RabbitMQ, Google GenAI |
| [`fileVerification`](fileVerification/) | Download uploaded files, extract and chunk text, sample chunks, and audit them before indexing | RabbitMQ, S3, Google GenAI |
| [`vector-service`](vector-service/) | Embed approved chunks and handle vector deletion messages | RabbitMQ, MySQL document status, Qdrant, Google GenAI embeddings |
| [`ticketChatService`](ticketChatService/) | Store ticket chat messages and serve REST history plus live STOMP messages | MySQL, RabbitMQ, WebSocket |
| [`email-service`](email-service/) | Send invitation and urgent-ticket emails | RabbitMQ, SMTP |
| [`frontend-helpdesk`](frontend-helpdesk/) | Employee, agent, and admin UI; same-origin API proxy | Next.js, REST, WebSocket |

## RabbitMQ event flows

![RabbitMQ routing detail showing exchanges, queues, publishers, and consumers](RabbitMQ%20routing%20detail.excalidraw.png)

RabbitMQ uses the three **direct exchanges** below. Their durable queues and bindings are defined in [`rabbitmq/definitions.json`](rabbitmq/definitions.json).

| Exchange | Routing key | Queue | Publisher → consumer |
| --- | --- | --- | --- |
| `document.exchange` | `document.verification.requested` | `document.verification.queue` | `raghelpdesk` → `fileVerification` |
| `document.exchange` | `document.verification.completed` | `document.verification.result.queue` | `fileVerification` → `raghelpdesk` |
| `document.exchange` | `document.vector.routing_key` | `document.vector.queue` | `fileVerification` → `vector-service` |
| `document.exchange` | `document.vector.delete.routing_key` | `document.vector.delete.queue` | `raghelpdesk` → `vector-service` |
| `chat.exchange` | `document.chat.routing_key` | `document.chat.queue` | `raghelpdesk` → `ticketChatService` |
| `email.exchange` | `invitation.email.routing_key` | `invitation.email.queue` | `raghelpdesk` → `email-service` |
| `email.exchange` | `urgent.email.routing_key` | `urgent.email.queue` | `raghelpdesk` → `email-service` |

### Document ingestion, step by step

1. An admin uploads a document to `raghelpdesk`. The API stores its metadata in MySQL and the file in S3, then publishes `document.verification.requested`.
2. `fileVerification` downloads the file, extracts and chunks its text, and asks an AI model to review sampled chunks for helpdesk relevance.
3. For an approved document, the worker publishes the full chunk set with `document.vector.routing_key`; `vector-service` embeds it in Qdrant with `companyId` and `documentId` metadata.
4. The worker publishes `document.verification.completed`; `raghelpdesk` updates the document's status. On rejection or admin deletion, the core service removes the S3 file and publishes a company-scoped vector cleanup event. `vector-service` checks document status before and after indexing so a concurrent deletion cannot leave newly added chunks searchable.
5. During AI chat, `raghelpdesk` searches Qdrant with a company filter, combines retrieved knowledge with chat memory, and streams the model's answer.

Ticket creation follows a separate path: `raghelpdesk` publishes to `chat.exchange` so `ticketChatService` can create the corresponding chat record. Urgent tickets and invitations publish to `email.exchange` for asynchronous delivery.

## Product features

- Company signup creates the first `ADMIN`; invited `AGENT` and `EMPLOYEE` users complete registration from emailed links. Accounts use JWT authentication.
- Ticket creation, assignment, status updates, priority levels, and real-time ticket conversations.
- Company-scoped RAG over approved documents, with streamed AI responses and conversation history.
- AI tools that can search, create, and update support tickets.
- Admin document uploads, verification status, user management, AI key settings, and invitations (including CSV bulk invitations).
- A Next.js frontend that can run against the live backend or a local mock API.

## Technology

Java 25 · Spring Boot 4.1.1 · Spring AI 2.0.1 · Next.js 16 · React 19 · MySQL · RabbitMQ · Qdrant · Amazon S3 · Google GenAI · STOMP WebSocket

## Run locally

The repository contains separate Maven projects for the five Java services and a separate Next.js application. Java 25, Node.js, Docker, an S3 bucket, Google GenAI credentials, and SMTP credentials are needed for the complete live flow.

1. Start MySQL and Qdrant with `docker compose -f raghelpdesk/compose.yaml up -d`.
2. Start RabbitMQ with `docker compose -f rabbitmq/docker-compose.yml up -d`. Its management UI is exposed on port `15672` by the local Compose file.
3. Configure each service using the environment variables referenced in its `src/main/resources/application.properties`. The vector worker now needs `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, and `SPRING_DATASOURCE_PASSWORD` for read access to the core MySQL `company_document` table. Configure `HELPDESK_API_MODE=live`, `HELPDESK_API_URL`, and `HELPDESK_TICKET_CHAT_URL` for the frontend. Set `APP_WEBSOCKET_ALLOWED_ORIGINS` on `ticketChatService` to the frontend's exact origin (for example, `https://helpdesk.example.com`; comma-separate multiple origins). Local development defaults to `http://localhost:3000` and `http://127.0.0.1:3000`. Keep credentials in local environment files or a secret manager, outside Git.
4. Start the Java services from their directories with `./mvnw spring-boot:run` (or `mvnw.cmd` on Windows).
5. In `frontend-helpdesk`, run `npm ci` and `npm run dev`, then open `http://localhost:3000`.

The core API uses port `8080` by default; ticket chat uses `8085` and email uses `8084`. The verification and vector workers take their ports from `SERVER_PORT`.

## Current status

This is a locally running portfolio project. Ticket chat checks the authenticated user's company and ticket membership for subscriptions, sends, and history reads; the STOMP endpoint accepts configured frontend origins. Document deletion publishes a Qdrant purge event, and the vector worker checks MySQL document status around indexing. New users start with token version 0. Focused tests pass, but live WebSocket and upload-to-delete integration checks remain. Before a public deployment, existing null token versions need a database migration, and reliable RabbitMQ publishing and recovery, broader integration tests, and deployment hardening need attention.
