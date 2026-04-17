# Commercial Copilot - Financial Portfolio Assistant

## 1. Project Overview
The **Commercial Copilot** is an AI-driven, asynchronous financial assistant designed for portfolio managers. It translates natural language questions into secure SQL queries, extracts real-time data from a MySQL database, generates strategic business insights, and delivers a human-readable response. 

This project was built as a technical assessment to demonstrate advanced software engineering practices, specifically focusing on overcoming legacy system bottlenecks like high latency, sequential processing, and lack of observability.


## 2. Architecture & Design Patterns

The application is built upon **Hexagonal Architecture (Ports & Adapters)** combined with **Domain-Driven Design (DDD)** principles. 

### Key Architectural Decisions:
- **Decoupling:** Business logic (Core) is completely isolated from external dependencies (HTTP, MySQL, Redis, Gemini AI). This allows for high testability and future-proofing.
- **Agentic Workflow (Plan-and-Execute):** Instead of a rigid sequential flow, the AI acts as a Planner, generating a **Directed Acyclic Graph (DAG)** of tasks.
- **True Parallelism (DAG Executor):** The Orchestrator resolves dependencies dynamically. If an `INSIGHT` task doesn't depend on `SQL_GEN`, they run simultaneously, drastically reducing response time.
- **Event-Driven / Workers:** Heavy tasks are delegated to background workers via a Message Broker, simulating a distributed microservices environment.
- **Streaming Responses (SSE):** To improve user experience, the API uses Server-Sent Events to stream progress updates in real-time, matching the behavior of modern LLM interfaces like ChatGPT.
- **Graceful Degradation:** The Caching layer prioritizes Redis but seamlessly falls back to an in-memory map if Redis is unavailable, ensuring high availability.


## 3. Technical Stack
- **Language:** TypeScript / Node.js
- **Framework:** Express.js
- **Database:** MySQL
- **AI Provider:** Google Gemini (`gemini-2.5-flash`) / Groq (`llama-3.3-70b-versatile`)
- **Caching:** Redis (with in-memory fallback)
- **Testing:** Jest (with full port mocking)
- **Infrastructure:** Docker & Docker Compose


## 4. Simplifications & Trade-offs (Test Context)
To ensure this assessment is easily runnable locally without requiring complex cloud setups, the following conscious simplifications were made:

1. **In-Memory Message Broker:** Instead of deploying RabbitMQ or AWS SQS, a robust `EventEmitter`-based broker was implemented to simulate RPC-over-queues and background workers.
2. **Simulated RBAC (JWT):** The Auth Middleware simulates token validation (`token-gerente-silva`) to inject the `managerId` into the request, rather than implementing a full OAuth2/JWT provider.
3. **LLM Abstraction:** The `gemini-2.5-flash`/`llama-3.3-70b-versatile` model was chosen over OpenAI due to its generous free tier for local testing, though the `LlmPort` allows swapping to OpenAI with zero changes to the business logic.


## 5. Future Roadmap (Next Steps)
If this were to evolve into a production-grade system, the immediate next steps would be:
- **Infrastructure & Scaling:** Replace the in-memory broker with a dedicated Message Queue system to allow workers to scale horizontally on separate servers, handling high loads gracefully.
- **Advanced Observability:** Implement comprehensive telemetry and structured logging to trace the exact execution time of each DAG node, monitor LLM token usage, and track the system's overall health.
- **Vector Database (RAG):** Introduce a Vector Database to implement Retrieval-Augmented Generation (RAG). This would allow the Copilot to answer questions based on unstructured data (like internal PDF reports and text guidelines), complementing the structured SQL data.
- **Human-in-the-Loop (Feedback Mechanism):** Add a feedback system (e.g., thumbs up/down, or "regenerate") to the user interface. Recording user satisfaction will help audit the AI's accuracy, identify hallucination patterns, and continuously improve the prompt engineering.
- **Audit Trails & Analytics:** Create a secure logging system to track exactly which queries the LLM generated for which user. This ensures strict compliance in the financial sector and helps product teams understand the most common needs of portfolio managers.
- **Multi-Agent Expansion:** Evolve the DAG Orchestrator to support more specialized workers, such as a "Predictive Modeling" worker to forecast sales or an "Action Item" worker to automatically draft follow-up emails based on the insights.


## 6. Getting Started

### Prerequisites
- Docker and Docker Compose installed.
- A free Google Gemini or Groq API Key

### Step-by-Step Setup
1. **Clone the repository:**
   ```bash
   git clone https://github.com/zushw/commercial_copilot
   cd commercial-copilot
    ```

2. **Environment Variables:**
Create a `.env` file in the root directory and add your keys (see `.env.example`):
    ```
    PORT=3000
    DB_HOST=example.com
    DB_PORT=3306
    DB_USER=example
    DB_PASSWORD=password
    DB_NAME=example
    GEMINI_API_KEY=your_gemini_api_key_here
    GROQ_API_KEY=your_groq_api_key_here
    REDIS_URL=redis://redis:6379
    ```

3. **Run with Docker:**
    ```bash
    docker-compose up --build
    ```

*The API will be available at `http://localhost:3000`.*

## 7. Usage & API Endpoint
To interact with the Copilot, send a POST request. The system uses Server-Sent Events (SSE), meaning the connection will stay open and stream progress updates until the final answer is ready.

### Example Request (cURL)
Open a new terminal and run:
```bash
curl -N -X POST http://localhost:3000/api/v1/copilot/ask \
-H "Content-Type: application/json" \
-H "Authorization: Bearer token-gerente-silva" \
-d '{
  "question": "Which are my 5 clients with the highest order volume?"
}'
```

## 8. Running Tests
The core business logic is heavily tested using Jest and Dependency Injection mocks. You can run the tests locally without Docker or external APIs:

```bash
npm install
npm test
```