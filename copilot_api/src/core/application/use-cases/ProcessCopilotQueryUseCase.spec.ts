import { ProcessCopilotQueryUseCase } from "./ProcessCopilotQueryUseCase";
import { UserQuery } from "../../domain/entities/UserQuery";
import { MessageBrokerPort } from "../ports/out/MessageBrokerPort";
import { LlmPort } from "../ports/out/LlmPort";
import { CachePort } from "../ports/out/CachePort";

describe("ProcessCopilotQueryUseCase", () => {
  let mockBroker: jest.Mocked<MessageBrokerPort>;
  let mockLlm: jest.Mocked<LlmPort>;
  let mockCache: jest.Mocked<CachePort>;
  let useCase: ProcessCopilotQueryUseCase;

  beforeEach(() => {
    mockBroker = {
      publish: jest.fn(),
      subscribe: jest.fn(),
      request: jest.fn(),
    };

    mockLlm = {
      generateExecutionPlan: jest.fn(),
      generateSql: jest.fn(),
      generateInsights: jest.fn(),
      generateFinalAnswer: jest.fn(),
    };

    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
    };

    useCase = new ProcessCopilotQueryUseCase(mockBroker, mockLlm, mockCache);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return cached response immediately when cache hit occurs", async () => {

    const query = new UserQuery("What are my top 5 customers?", "manager-123");

    const cachedResponse = {
      answer: "Cached answer: Customer A, B, C...",
      insights: ["Cached insight"],
      generatedSql: "SELECT * FROM customers LIMIT 5;",
      executionTimeMs: 10,
    };

    mockCache.get.mockResolvedValueOnce(JSON.stringify(cachedResponse));


    const result = await useCase.execute(query);


    expect(mockCache.get).toHaveBeenCalledTimes(1);
    expect(result.answer).toBe("Cached answer: Customer A, B, C...");

    expect(mockLlm.generateExecutionPlan).not.toHaveBeenCalled();
    expect(mockBroker.request).not.toHaveBeenCalled();
    expect(mockCache.set).not.toHaveBeenCalled();
  });

  it("should generate execution plan and orchestrate workers when cache miss occurs", async () => {

    const query = new UserQuery("Summarize my portfolio", "manager-123");

    mockCache.get.mockResolvedValueOnce(null);

    mockLlm.generateExecutionPlan.mockResolvedValueOnce([
      { worker: "ANSWER_COMPOSITION", depends_on: null, task: "Generate summary" },
    ]);

    mockBroker.request.mockResolvedValueOnce("Here is the summary of your portfolio.");


    const result = await useCase.execute(query);


    expect(mockCache.get).toHaveBeenCalledTimes(1);

    expect(mockLlm.generateExecutionPlan).toHaveBeenCalledTimes(1);
    expect(mockBroker.request).toHaveBeenCalledTimes(1);

    expect(mockBroker.request).toHaveBeenCalledWith(
      "WORKER:ANSWER_COMPOSITION",
      expect.objectContaining({
        managerId: "manager-123",
      }),
      expect.any(Function)
    );

    expect(result.answer).toBe("Here is the summary of your portfolio.");

    expect(mockCache.set).toHaveBeenCalledTimes(1);
    expect(mockCache.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("Here is the summary"),
      3600
    );
  });

  it("should throw an error when query is invalid", async () => {

    const invalidQuery = new UserQuery("", "manager-123");


    await expect(useCase.execute(invalidQuery)).rejects.toThrow(
      "Invalid query parameters"
    );

    expect(mockCache.get).not.toHaveBeenCalled();
    expect(mockLlm.generateExecutionPlan).not.toHaveBeenCalled();
    expect(mockBroker.request).not.toHaveBeenCalled();
  });

  it("should ignore cache if cached content is invalid JSON and continue processing normally", async () => {

    const query = new UserQuery("List my customers", "manager-123");

    mockCache.get.mockResolvedValueOnce("INVALID_JSON");

    mockLlm.generateExecutionPlan.mockResolvedValueOnce([
      { worker: "ANSWER_COMPOSITION", depends_on: null, task: "List customers" },
    ]);

    mockBroker.request.mockResolvedValueOnce("Here are your customers.");


    const result = await useCase.execute(query);


    expect(mockCache.get).toHaveBeenCalledTimes(1);
    expect(mockLlm.generateExecutionPlan).toHaveBeenCalledTimes(1);
    expect(mockBroker.request).toHaveBeenCalledTimes(1);

    expect(result.answer).toBe("Here are your customers.");
    expect(mockCache.set).toHaveBeenCalledTimes(1);
  });

  it("should throw if LLM fails to generate an execution plan", async () => {

    const query = new UserQuery("Show revenue by region", "manager-123");

    mockCache.get.mockResolvedValueOnce(null);

    mockLlm.generateExecutionPlan.mockRejectedValueOnce(
      new Error("LLM service unavailable")
    );


    await expect(useCase.execute(query)).rejects.toThrow(
      "LLM service unavailable"
    );

    expect(mockBroker.request).not.toHaveBeenCalled();
    expect(mockCache.set).not.toHaveBeenCalled();
  });

  it("should throw if broker request fails during worker execution", async () => {

    const query = new UserQuery("Get sales trends", "manager-123");

    mockCache.get.mockResolvedValueOnce(null);

    mockLlm.generateExecutionPlan.mockResolvedValueOnce([
      { worker: "ANSWER_COMPOSITION", depends_on: null, task: "Generate sales trends" },
    ]);

    mockBroker.request.mockRejectedValueOnce(new Error("Broker timeout"));


    await expect(useCase.execute(query)).rejects.toThrow("Broker timeout");

    expect(mockCache.set).not.toHaveBeenCalled();
  });

  it("should cache the final result after successful execution", async () => {

    const query = new UserQuery("Who are my best customers?", "manager-123");

    mockCache.get.mockResolvedValueOnce(null);

    mockLlm.generateExecutionPlan.mockResolvedValueOnce([
      { worker: "ANSWER_COMPOSITION", depends_on: null, task: "Compute best customers" },
    ]);

    mockBroker.request.mockResolvedValueOnce("Your best customers are A, B and C.");


    const result = await useCase.execute(query);


    expect(result.answer).toBe("Your best customers are A, B and C.");

    expect(mockCache.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      3600
    );
  });

  it("should not crash if cache.set fails after successful execution", async () => {

    const query = new UserQuery("What is my revenue?", "manager-123");

    mockCache.get.mockResolvedValueOnce(null);

    mockLlm.generateExecutionPlan.mockResolvedValueOnce([
      { worker: "ANSWER_COMPOSITION", depends_on: null, task: "Compute revenue" },
    ]);

    mockBroker.request.mockResolvedValueOnce("Your revenue is $10,000.");

    mockCache.set.mockRejectedValueOnce(new Error("Redis write failed"));


    const result = await useCase.execute(query);


    expect(result.answer).toBe("Your revenue is $10,000.");
    expect(mockCache.set).toHaveBeenCalledTimes(1);
  });
});