import { MessageBrokerPort } from "../../../core/application/ports/out/MessageBrokerPort";
import { DatabasePort } from "../../../core/application/ports/out/DatabasePort";
import { LlmPort } from "../../../core/application/ports/out/LlmPort";

export class CopilotWorkers {
    constructor (
        private broker: MessageBrokerPort,
        private dbPort: DatabasePort,
        private llmPort: LlmPort
    ) {}

    public startListening(): void {
        console.log("Workers are starting to listen to queues...");

        this.broker.subscribe('WORKER:SQL_GEN', async ({ question }) => {
            console.log(`[Worker:SQL_GEN] Processing data extraction for: "${question}"`);
            const schema = await this.dbPort.getSchemaDefinition();
            const sqlQuery = await this.llmPort.generateSql(question, schema);
            const data = await this.dbPort.executeReadQuery(sqlQuery);
            return { sqlQuery, data };
        });

        this.broker.subscribe('WORKER:INSIGHT', async ({ question, data }) => {
            console.log(`[Worker:INSIGHT] Generationg insights for data size: ${data.length}`);
            const insight = await this.llmPort.generateInsights(question, data)
            return insight;
        });

        this.broker.subscribe('WORKER:ANSWER_COMPOSITION', async ({ question, data, insights }) => {
            console.log(`[Worker:ANSWER_COMPOSITION] Crafting final human response...`);
            const answer = await this.llmPort.generateFinalAnswer(question, data, insights);
            return answer;
        });
    }
}