import { GoogleGenerativeAI } from "@google/generative-ai";
import { LlmPort } from "../../../core/application/ports/out/LlmPort";
import { ExecutionPlan } from "../../../core/application/dtos/ExecutionPlanDto";

export class GeminiAdapter implements LlmPort {
    private genAI: GoogleGenerativeAI;
    private modelName = 'gemini-2.5-flash';

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY || ''

        if (!apiKey) {
            console.warn('[GeminiAdapter] Warning: GEMINI_API_KEY is not set in environment variables.');
        }

        this.genAI = new GoogleGenerativeAI(apiKey)
    }

    async generateExecutionPlan(question: string): Promise<ExecutionPlan> {
        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            generationConfig: { temperature:0, responseMimeType: "application/json"}
        });

        const prompt = `You are the AI Orchestrator for a financial copilot.
        Your job is to analyze the user's question and create an execution plan using specific workers.
        
        Available workers:
        - "SQL_GEN": Extracts data from the database.
        - "INSIGHT": Analyzes data to provide strategic business recommendations.
        - "ANSWER_COMPOSITION": Always required as the final step to talk to the user.

        Rules for dependencies ("depends_on"):
        - If a task needs data from the database, it MUST depend on "SQL_GEN".
        - If the user only asks for raw data (e.g., "Top 5 customers"), do NOT schedule the "INSIGHT" worker.
        - "ANSWER_COMPOSITION" must depend on whatever was the last step.

        User Question: "${question}"

        Respond ONLY with a valid JSON array matching this exact structure:
        [
        { "worker": "WORKER_NAME", "depends_on": null | "OTHER_WORKER_NAME", "task": "Description of what to do" }
        ]`;

        const result = await model.generateContent(prompt);

        try {
            const planText = result.response.text().trim();
            const plan = JSON.parse(planText) as ExecutionPlan;
            return plan;
        } catch (error) {
            console.error('[GeminiAdapter] Failed to parse execution plan:', result.response.text());
            return [
                { worker: 'SQL_GEN', depends_on: null, task: 'Extract data safely' },
                { worker: 'ANSWER_COMPOSITION', depends_on: 'SQL_GEN', task: 'Formulate final answer' }
            ];
        }
    }

    async generateSql(question: string, schema: string, managerId: string): Promise<string> {
        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            generationConfig: { temperature: 0 }
        });

        const prompt = `You are an expert MySQL database architect. 
        Given the following database schema:
        ${schema}
        
        Translate the user's natural language question into a valid, read-only SELECT SQL query.
        
        CRITICAL SECURITY RULE (RBAC) - MANAGER ID: '${managerId}'
        You MUST restrict the SQL query so the manager only sees their own data, BUT ONLY apply filters where structurally possible based on the schema:
        1. If querying 'orders', you MUST add: WHERE employee_id = '${managerId}'
        2. If querying 'customers', you MUST JOIN with 'orders' and filter by orders.employee_id = '${managerId}'. DO NOT try to find employee_id in the customers table directly.
        3. If querying 'products' alone, NO RBAC filter is needed (products are global).
        4. NEVER invent columns. ONLY use the exact columns listed in the schema.

        IMPORTANT: Return ONLY the raw SQL string. Do not include markdown formatting like \`\`\`sql or any explanations.
        
        User Question: ${question}`;

        const result = await model.generateContent(prompt);
        let sql = result.response.text().trim();

        sql = sql.replace(/```sql/g, '').replace(/```/g, '').trim();

        return sql;
    }

    async generateInsights(question: string, data: any[]): Promise<string[]> {
        if (!data || data.length === 0) return ['No data available to generate insights.'];

        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            generationConfig: { temperature: 0.7 }
        });

        const dataString = JSON.stringify(data).substring(0, 3000);

        const prompt = `You are a financial portfolio data analyst. 
        Analyze the provided JSON data result based on the user's question.
        Generate exactly 3 actionable and concise business insights.
        Format your response as a simple list separated by the '|' character, with no numbers or bullets.
        
        Question: ${question}
        Data: ${dataString}`;

        const result = await model.generateContent(prompt);
        const rawInsights = result.response.text().trim();

        return rawInsights.split('|').map(insight => insight.trim()).filter(i => i.length > 0);
    }

    async generateFinalAnswer(question: string, data: any[], insights: string[]): Promise<string> {
        const model = this.genAI.getGenerativeModel({ 
            model: this.modelName,
            generationConfig: { temperature: 0.5 }
        });
    
        const dataString = JSON.stringify(data || []).substring(0, 1500);
        const insightsString = (insights || []).join(', ');

        const prompt = `You are a helpful Commercial Copilot assistant for portfolio managers.
        Based on the user's question, the database results, and the generated insights, write a clear, professional, and direct answer.
        Do not mention that you queried a database or used SQL. Speak directly to the portfolio manager.
        
        Question: ${question}
        Data Summary: ${dataString}
        Insights: ${insightsString}`;

        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    }
}