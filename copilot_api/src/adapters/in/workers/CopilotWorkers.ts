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

        this.broker.subscribe('WORKER:SQL_GEN', async ({ question }, progress) => {
            console.log(`[Worker:SQL_GEN] Processing data extraction for: "${question}"`);
            progress({ step: 'sql', status: 'Starting data interpretation...' });
            const schema = await this.dbPort.getSchemaDefinition();
            progress({ step: 'sql', status: 'Generating SQL query...' });
            const sqlQuery = await this.llmPort.generateSql(question, schema);
            progress({ step: 'sql', status: 'Accessing database...' });
            const data = await this.dbPort.executeReadQuery(sqlQuery);
            return { sqlQuery, data };
        });

        this.broker.subscribe('WORKER:INSIGHT', async ({ question, data }, progress) => {
            console.log(`[Worker:INSIGHT] Generationg insights for data size: ${data.length}`);
            progress({ step: 'insight', status: `Analyzing  ${data.length} records to generate strategic insights...` });
            const insight = await this.llmPort.generateInsights(question, data)
            return insight;
        });

        this.broker.subscribe('WORKER:ANSWER_COMPOSITION', async ({ question, data, insights }, progress) => {
            console.log(`[Worker:ANSWER_COMPOSITION] Crafting final human response...`);
            progress({ step: 'answer', status: 'Synthesizing the final answer...' });
            const answer = await this.llmPort.generateFinalAnswer(question, data, insights);
            return answer;
        });
    }
}