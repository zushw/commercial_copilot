import { UserQuery } from "../../domain/entities/UserQuery";
import { CopilotResponse } from "../../domain/entities/CopilotResponse";
import { MessageBrokerPort } from "../ports/out/MessageBrokerPort";
import { LlmPort } from "../ports/out/LlmPort";

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

            let sqlQuery = '';
            let queryResult: any[] = [];
            let insights: string[] = [];
            let finalAnswer = '';

            const sqlTask = plan.find(t => t.worker === 'SQL_GEN');
            const insightTask = plan.find(t => t.worker === 'INSIGHT');
            const answerTask = plan.find(t => t.worker === 'ANSWER_COMPOSITION');

            if (sqlTask) {
                const result = await this.broker.request('WORKER:SQL_GEN', { question: query.question }, report);
                sqlQuery = result.sqlQuery;
                queryResult = result.data;
            }

            if (insightTask) {
                insights = await this.broker.request('WORKER:INSIGHT', { 
                    question: query.question, 
                    data: queryResult 
                }, report);
            }

            if (answerTask) {
                finalAnswer = await this.broker.request('WORKER:ANSWER_COMPOSITION', { 
                    question: query.question, 
                    data: queryResult, 
                    insights 
                }, report);
            }
        
            const executionTimeMs = Date.now() - startTime;

            return new CopilotResponse(finalAnswer, insights, sqlQuery, executionTimeMs);
        } catch (error: any) {
            console.error('[ProcessCopilotQueryUseCase] Error executing query:', error);
            throw new Error(`Failed to process copilot query: ${error.message}`);
        }
    }
}