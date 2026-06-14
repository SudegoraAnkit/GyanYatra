# GYAN-ONBOARD-STRATEGY.md


# GyanYatra Engineering Onboarding & Codebase Comprehension Strategy
**Target Audience:** New Engineering Joinees  
**Project Branch Context:** `feat-custom-yatras`  
**System Architecture:** Multi-Module Decoupled Java Spring Boot Backend + React SPA Frontend (Vite)

---

## 1. Executive Summary & Core Architectural Pillars

Welcome to the GyanYatra engineering team! GyanYatra is a decoupled, enterprise-grade platform engineered to deliver structured spiritual journeys ("Yatras") driven by automated AI workflows and user engagement tracking. 

As a new engineer, your mental model of the codebase must be strictly anchored around three fundamental technical guardrails. Every feature you write, modify, or extend must respect these architectural invariants:

1. **Decoupling Defense (Core Isolation):** The platform utilizes a strict Maven multi-module modular structure. Domain layers, entity relationships, and core database interactions live exclusively inside `gyanyatra_core`. This module is entirely decoupled from the presentation layer and possesses zero knowledge of HTTP web components, serialization protocols, or REST annotations. Shifting from REST endpoints to GraphQL, gRPC, or an event-driven consumer requires absolutely zero changes within `gyanyatra_core`.
2. **Stateless Security Boundary:** Authentication and authorization are strictly handled via cryptographically validated tokens within an incoming `JwtFilter` residing inside `gyanyatra_api`. User security claims are unpacked and committed directly to the Spring Security `SecurityContextHolder` per request. The backend remains completely stateless, eliminating session-replication overhead and making the app horizontally scalable behind standard load balancers.
3. **Normalized Relational Data Integrity:** Custom user journeys are built step-by-step into a highly structured, fully normalized relational model instead of relying on loose, unvalidated JSON blobs. The data engine enforces strict schema validations down the entity chain (`SatsangYatra` $\rightarrow$ `YatraTopic` $\rightarrow$ `Lesson`). This ensures reliable transactional boundaries, deep analytical querying, and data consistency for downstream reporting.

---

## 2. Platform Multi-Module Architecture

The application is structured into clearly bounded directories to isolate concerns and manage code complexity across different domains.

### System Directory Layout
```text
gyanyatra/
├── backend/
│   ├── gyanyatra_core/      # Domain Layer (JPA Entities, Repositories, Core Services)
│   ├── gyanyatra_api/       # Presentation Layer (REST Controllers, JWT Filters, Security)
│   └── gyanyatra_ai/        # AI & Integration Layer (Gemini LLM, YouTube Client Data)
└── frontend/                # Single Page Application UI (Vite, React, Tailwind CSS)

```

### Module Responsibilities

* **`gyanyatra_core`**: The single source of truth for business rules and data state. It manages relationships across primary entities like `User`, `SatsangYatra`, `YatraTopic`, `Lesson`, `Journal`, and `UserActivity`.
* **`gyanyatra_api`**: Serves as the gateway for external client interaction. It imports `gyanyatra_core`, acts as the ingress web framework, manages request filter lifecycles, maps REST DTOs, and exposes API endpoints to the frontend.
* **`gyanyatra_ai`**: Extends system capability by interfacing asynchronously with the YouTube Data API to fetch transcripts, and invoking Google GenAI (Gemini) endpoints to build comprehensive textual summaries ("Acharya Analysis").

---

## 3. Codebase Exploration: Step-by-Step Discovery Strategy

To maximize comprehension and minimize cognitive overload, do not read files alphabetically. Follow this targeted, trace-driven execution path across the modules:

### Phase 1: Deep Dive into the Domain Layer (`gyanyatra_core`)

Open the `gyanyatra_core` project module and analyze the relational schema definitions to understand the core engine's bounds:

1. **`User.java`**: Inspect the principal user record and authorization structure.
2. **`SatsangYatra.java` $\rightarrow$ `YatraTopic.java` $\rightarrow$ `Lesson.java**`: Trace this exact 1-to-Many nested cascading chain. Notice how relationships are tightly bounded using JPA annotations rather than unstructured text fields.
3. **`Journal.java` & `UserActivity.java**`: Observe how user reflections and metrics tie cleanly back to specific nodes in the journey.

### Phase 2: Trace the Web Lifecycle & Security Ingress (`gyanyatra_api`)

Understand how data safely crosses the system network boundary:

1. **`JwtFilter.java`**: Locate this filter component. Trace how it extracts the `Authorization: Bearer <token>` token header, validates its cryptographic signature, and transparently hydration-injects context into Spring Security's infrastructure.
2. **`SatsangYatraController.java` & `JournalController.java**`: Review how inbound HTTP request payloads map cleanly to DTO classes and immediately delegate their business payloads downward into core services.

### Phase 3: Inspect the External Processing Pipeline (`gyanyatra_ai`)

1. **`YouTubeClientImpl.java`**: Analyze how the system processes external payloads and captures YouTube metadata streams.
2. **`AcharyaServiceGemini.java`**: Review how prompt criteria are built and fired to the Gemini model to parse video transcripts into highly organized, instructional learning steps.

### Phase 4: Examine UI Interaction Points (`frontend`)

1. **`src/curriculum.json`**: Inspect this file to see how client components model journey configurations before transferring data packages back to the database.
2. **`src/YatraDesigner.jsx`**: Dive into this component canvas to see how the user builds custom paths visually while adhering to the backend's relational data expectations.

---

## 4. Production & Scale Performance Metrics

GyanYatra operates on a highly optimized, deterministic compute stack. As a developer writing features, your code must respect our baseline scale thresholds to prevent resource exhaustion:

### Baseline Compute Profile

* **Host Provisioning:** 2 vCPUs, 4GB RAM per container instance.
* **Web Server Pool:** Embedded Tomcat container capped at **200 concurrent worker threads**.
* **Database Client Connections:** HikariCP connection pool maximized to **10 client connections**.

### Throughput Profiles & Thread Saturation Boundaries

* **Standard CRUD Database Transactions:** Complete with an average execution cycle of **~50ms**. At this speed, the platform can scale to a maximum performance ceiling of **200 Requests Per Second (RPS)** across the connection pool.
* **Heavy AI Processing Workflows:** External calls to Gemini and video metadata extractions are heavily blocking, taking an average of **~3 seconds** to resolve.

> [!WARNING]
> **Thread Starvation Risk:** Running a 3-second blocking AI call synchronously on a standard Tomcat worker thread locks that thread completely. Because our database pool is capped at 10, executing blocking tasks on web threads can starve resources, capping instance capacity at **~66 RPS** and leading to gateway timeouts.
> **Actionable Mandate:** Never execute long-running AI operations or external API calls inside an active HTTP worker thread or database transaction. Always decouple heavy operations asynchronously via background workers, event handlers, or message queues (e.g., using Spring's `@Async` or dedicated message consumers).

---

## 5. Immediate First-Week Action Items

To gain practical traction in your first 5 days, execute these tasks:

### Task 1: Environment Setup & Local Build Verification

* Verify you are using **Java 17+** and **Node.js 18+** in your environment.
* Copy the example configuration properties files and supply your local sandbox database credentials alongside your Google Gemini and YouTube data tokens.
* Run a clean compilation from the root directory:
```bash
# Build and compile all backend modules
mvn clean install

# Boot and run the React development environment
cd frontend
npm install
npm run dev

```



### Task 2: Code Architecture Scavenger Hunt

Locate and verify the following implementations inside your IDE to confirm system structural understanding:

* *Where does the global exception handler intercept `ResourceNotFoundException` to convert it into a uniform JSON error payload?*
* *How is the database transaction managed when a user saves a multi-tier custom Yatra along with its nested topics?*
* *In the frontend application, where is the Bearer token appended to outgoing Axios/Fetch network streams?*

### Task 3: Complete a Low-Risk Onboarding Ticket

* Locate an open onboarding item to add a tracking field (such as `updatedAt` or `createdBy`) down the `gyanyatra_core` entity model chain. Ensure database schema compatibility, update the repository layers, and safely pass it through the `gyanyatra_api` DTO response mappings.

```

```
