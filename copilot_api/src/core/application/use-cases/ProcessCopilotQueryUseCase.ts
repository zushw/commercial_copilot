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

        if(!query.isValid()){
            throw new Error('Invalid query parameters');
        }

        try {
            const schema = await this.dbPort.getSchemaDefinition();
            const sqlQuery = await this.llmPort.generateSql(query.question, schema);
            const queryResult = await this.dbPort.executeReadQuery(sqlQuery);
            const [insight, answer] = await Promise.all([
                this.llmPort.generateInsights(query.question, queryResult),
                this.llmPort.generateFinalAnswer(query.question, queryResult, [])
            ]);
        
            const executionTimeMs = Date.now() - startTime;

            return new CopilotResponse(
                answer, insight, sqlQuery, executionTimeMs
            );
        } catch (error: any) {
            console.error('[ProcessCopilotQueryUseCase] Error executing query:', error);
            throw new Error(`Failed to process copilot query: ${error.message}`);
        }
    }
}