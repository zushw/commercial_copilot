import { UserQuery } from "../../domain/entities/UserQuery";
import { CopilotResponse } from "../../domain/entities/CopilotResponse";
import { DatabasePort } from "../ports/out/DatabasePort";
import { LlmPort } from "../ports/out/LlmPort";

export class ProcessCopilotQueryUseCase {
    constructor(
        private readonly dbPort: DatabasePort,
        private readonly llmPort: LlmPort
    ) {}

    async execute(query: UserQuery): Promise<CopilotResponse> {
        const startTime = Date.now();

        if (!query.isValid()) throw new Error('Invalid query parameters');

        try {
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
                console.log(`[Worker Sim] Running SQL_GEN: ${sqlTask.task}`);
                const schema = await this.dbPort.getSchemaDefinition();
                sqlQuery = await this.llmPort.generateSql(query.question, schema);
                queryResult = await this.dbPort.executeReadQuery(sqlQuery);
            }

            if (insightTask) {
                console.log(`[Worker Sim] Running INSIGHT: ${insightTask.task}`);
                insights = await this.llmPort.generateInsights(query.question, queryResult);
            }

            if (answerTask) {
                console.log(`[Worker Sim] Running ANSWER_COMPOSITION: ${answerTask.task}`);
                finalAnswer = await this.llmPort.generateFinalAnswer(query.question, queryResult, insights);
            }
        
            const executionTimeMs = Date.now() - startTime;

            return new CopilotResponse(finalAnswer, insights, sqlQuery, executionTimeMs);
        } catch (error: any) {
            console.error('[ProcessCopilotQueryUseCase] Error executing query:', error);
            throw new Error(`Failed to process copilot query: ${error.message}`);
        }
    }
}