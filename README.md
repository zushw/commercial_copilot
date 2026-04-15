# Commercial Copilot - Financial Portfolio Assistant

## 1. Project Overview

This project is a technical solution for a **Commercial Copilot** designed for portfolio managers in a financial institution. The system aims to provide real-time insights, performance analysis, and decision-making support for merchant data.

## 2. Problem Diagnosis

### The legacy system faces significant bottlenecks:
- **High Latency**: Sequential processing leads to slow response times.
- **Scalability Issues**: Difficulty handling increasing user volumes.
- **Fragility**: Lack of resilience during failures.
- **Security Risks**: Unstructured data access protocols.
- **Observability Gap**: Lack of transparency in how responses are generated.

## 3. Proposed Architecture: Hexagonal (Ports & Adapters)

To solve these issues and ensure the system's evolution, we are implementing **Hexagonal Architecture** combined with **SOLID** principles.

**Key Benefits**:
- **Decoupling**: Business logic is independent of external tools (LLMs, MySQL, Express).
- **Testability**: Ports allow easy mocking of external services for high-quality testing.
- **Async/Parallel Processing**: Transitioning from sequential to non-blocking operations to improve performance.

## 4. Technical Decisions

### A. Asynchronous & Parallel Strategy
To reduce response time, the system utilizes Node.js non-blocking I/O. The **Orchestrator** triggers parallel workers for Data Fetching (SQL) and Insight Generation, consolidating results at the end.

### B. LLM Integration (Text-to-SQL & Insights)
The system leverages LLMs to interpret natural language, generating structured SQL queries for the **Database**. This ensures high flexibility in answering complex business questions.

### C. Security & RBAC
Access to data is filtered through a **Role-Based Access Control (RBAC)** layer, ensuring that portfolio managers only access data relevant to their assigned customers.

### D. Observability & Transparency
Integrated **Distributed Tracing** and structured logging provide full visibility into the AI's "Chain of Thought" and the final SQL execution, resolving the "black box" issue.

## 5. Project Structure

```
src/
├── core/                               # The Hexagon (Logic)
│   ├── domain/                         # Enterprise Business Rules
│   │   ├── entities/                   # Domain Models 
│   │   ├── services/                   # Domain Services
│   │   └── exceptions/                 # Business-specific errors
│   └── application/                    # Application Business Rules
│       ├── use-cases/                  # Orchestrators
│       ├── ports/                      # The Boundaries (Interfaces)
│       │   ├── in/                     # Primary Ports (API/Worker contracts)
│       │   └── out/                    # Secondary Ports (DB/AI/Messaging contracts)
│       └── dtos/                       # Data Contracts (Input/Output schemas)
│
├── adapters/                           # Outside the Hexagon (Implementation)
│   ├── in/                             # Drivers (Triggers the Core)
│   │   ├── http/                       # Express Controllers / Middlewares 
│   │   └── workers/                    # Queue Consumers (Background tasks)
│   └── out/                            # Driven (Called by the Core)
│       ├── persistence/                # Database Implementation
│       ├── ai/                         # LLM Providers
│       └── messaging/                  # Event Publishers (Queue Producers)
│
├── common/                             # Cross-cutting Concerns
│   ├── logger/                         # Observability & Tracing
│   ├── errors/                         # Global Application Errors
│   └── utils/                          # Non-business utility functions
│
└── main/                               # Composition Root (Framework & DI)
    ├── config/                         # Environment variables & Database setup
    ├── factories/                      # Dependency Injection wire-up
    └── server.ts                       # Entry point (Server startup)
```

## 6. Infrastructure & DevOps

- **Containerization**: Fully Dockerized for scalability and environment parity.
- **CI/CD Pipeline**: Automated testing and deployment via GitHub Actions.
- **Database**: Hosted on AWS RDS.