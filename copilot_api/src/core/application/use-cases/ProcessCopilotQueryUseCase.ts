import { UserQuery } from "../../domain/entities/UserQuery";
import { CopilotResponse } from "../../domain/entities/CopilotResponse";
import { MessageBrokerPort } from "../ports/out/MessageBrokerPort";
import { LlmPort } from "../ports/out/LlmPort";
import { TaskNode } from "../dtos/ExecutionPlanDto";

export class ProcessCopilotQueryUseCase {
    constructor(
        private readonly broker: MessageBrokerPort,
        private readonly llmPort: LlmPort
    ) {}

    async execute(query: UserQuery, onProgress?: (msg: string) => void): Promise<CopilotResponse> {
        const startTime = Date.now();

        if (!query.isValid()) throw new Error('Invalid query parameters');

        const report = (data: any) => {
            if (onProgress) onProgress(JSON.stringify({ type: 'progress', ...data }));
        }

        try {
            report({ status: 'Analyzing the question intent...' });
            const plan = await this.llmPort.generateExecutionPlan(query.question);
            console.log(`[Use Case] Execution Plan:`, JSON.stringify(plan, null, 2));

            const taskPromises: Record<string, Promise<TaskNode[]>> = {};
            const taskResults: Record<string, any> = {};

            const executeTask = async (task: TaskNode) => {
                if (task.depends_on && taskPromises[task.depends_on]) {
                    await taskPromises[task.depends_on];
                }

                const payload: any = { question: query.question, managerId: query.portfolioManagerId };

                if (task.worker === 'INSIGHT' && taskResults['SQL_GEN']) {
                    payload.data = taskResults['SQL_GEN'].data;
                }

                if (task.worker === 'ANSWER_COMPOSITION') {
                    payload.data = taskResults['SQL_GEN']?.data || []
                    payload.insight = taskResults['INSIGHT'] || []
                }

                const result = await this.broker.request(`WORKER:${task.worker}`, payload, report);
                taskResults[task.worker] = result;
                return result;
            };

            plan.forEach(task => {
                taskPromises[task.worker] = executeTask(task);
            });

            await Promise.all(Object.values(taskPromises));

            const executionTimeMs = Date.now() - startTime;

            const sqlQuery = taskResults['SQL_GEN']?.sqlQuery || '';
            const insights = taskResults['INSIGHT'] || [];
            const finalAnswer = taskResults['ANSWER_COMPOSITION'] || "Wasn't possible to generate the response.";

            return new CopilotResponse(finalAnswer, insights, sqlQuery, executionTimeMs);
        } catch (error: any) {
            console.error('[ProcessCopilotQueryUseCase] Error executing query:', error);
            throw new Error(`Failed to process copilot query: ${error.message}`);
        }
    }
}