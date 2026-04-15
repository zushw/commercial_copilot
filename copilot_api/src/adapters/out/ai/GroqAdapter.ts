import Groq from "groq-sdk";
import { LlmPort } from "../../../core/application/ports/out/LlmPort";
import { ExecutionPlan } from "../../../core/application/dtos/ExecutionPlanDto";

export class GroqAdapter implements LlmPort {
    private groq: Groq;
    private modelName = 'llama-3.3-70b-versatile'; 

    constructor() {
        const apiKey = process.env.GROQ_API_KEY || '';

        if (!apiKey) {
            console.warn('[GroqAdapter] Warning: GROQ_API_KEY is not set in environment variables.');
        }

        this.groq = new Groq({ apiKey });
    }

    async generateExecutionPlan(question: string): Promise<ExecutionPlan> {
        const prompt = `You are the AI Orchestrator for a financial copilot.
        Your job is to analyze the user's question and create an execution plan using specific workers.
        
        Available workers:
        - "SQL_GEN": Extracts data. ONLY use this if the user asks to identify specific rows, numbers, lists of names, or quantitative metrics from their database (e.g., "Who are my top 5?", "How many orders?").
        - "INSIGHT": Analyzes data. ONLY use if SQL_GEN is also in the plan.
        - "ANSWER_COMPOSITION": Always required as the final step.

        CRITICAL ROUTING RULES (ANTI-HALLUCINATION):
        1. STRICT NO-DATA RULE: If the user is asking for general business advice, negotiation strategies, theoretical concepts, or "how-to" guides (e.g., "How to re-engage a client?", "Best strategies for retail"), DO NOT USE "SQL_GEN". 
        2. KEYWORD TRAP: The presence of words like "client", "orders", "sales", or "portfolio" DO NOT automatically mean you need SQL. Only use SQL if the user wants to EXTRACT SPECIFIC VALUES.
        3. If rule 1 or 2 applies, your plan MUST ONLY contain "ANSWER_COMPOSITION" (depends_on: null). The LLM already has the business knowledge to answer strategic questions without querying the database.

        User Question: "${question}"

        Respond ONLY with a valid JSON array matching this exact structure:
        [
        { "worker": "WORKER_NAME", "depends_on": null | "OTHER_WORKER_NAME", "task": "Description of what to do" }
        ]`;

        try {
            const completion = await this.groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: this.modelName,
                temperature: 0,
            });

            let planText = completion.choices[0]?.message?.content?.trim() || "[]";
            
            planText = planText.replace(/```json/gi, '').replace(/```/g, '').trim();
            
            const plan = JSON.parse(planText) as ExecutionPlan;
            return plan;

        } catch (error) {
            console.error('[GroqAdapter] Failed to parse execution plan:', error);
            return [
                { worker: 'SQL_GEN', depends_on: null, task: 'Extract data safely' },
                { worker: 'ANSWER_COMPOSITION', depends_on: 'SQL_GEN', task: 'Formulate final answer' }
            ];
        }
    }

    async generateSql(question: string, schema: string, managerId: string): Promise<string> {
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

        try {
            const completion = await this.groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: this.modelName,
                temperature: 0,
            });

            let sql = completion.choices[0]?.message?.content?.trim() || "";
            sql = sql.replace(/```sql/gi, '').replace(/```/g, '').trim();

            return sql;
        } catch (error) {
            console.error('[GroqAdapter] Failed to generate SQL:', error);
            throw error;
        }
    }

    async generateInsights(question: string, data: any[]): Promise<string[]> {
        if (!data || data.length === 0) return ['No data available to generate insights.'];

        const dataString = JSON.stringify(data).substring(0, 3000);

        const prompt = `You are a financial portfolio data analyst. 
        Analyze the provided JSON data result based on the user's question.
        Generate exactly 3 actionable and concise business insights.
        Format your response as a simple list separated by the '|' character, with no numbers or bullets.
        
        Question: ${question}
        Data: ${dataString}`;

        try {
            const completion = await this.groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: this.modelName,
                temperature: 0.7,
            });

            const rawInsights = completion.choices[0]?.message?.content?.trim() || "";
            return rawInsights.split('|').map(insight => insight.trim()).filter(i => i.length > 0);
        } catch (error) {
            console.error('[GroqAdapter] Failed to generate insights:', error);
            return ['Failed to generate insights due to an external API error.'];
        }
    }

    async generateFinalAnswer(question: string, data: any[], insights: string[]): Promise<string> {
        const dataString = JSON.stringify(data || []).substring(0, 1500);
        const insightsString = (insights || []).join(', ');

        const prompt = `You are a helpful Commercial Copilot assistant for portfolio managers.
        Based on the user's question, the database results, and the generated insights, write a clear, professional, and direct answer.
        Do not mention that you queried a database or used SQL. Speak directly to the portfolio manager.
        
        Question: ${question}
        Data Summary: ${dataString}
        Insights: ${insightsString}`;

        try {
            const completion = await this.groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: this.modelName,
                temperature: 0.5,
            });

            return completion.choices[0]?.message?.content?.trim() || "Sorry, I couldn't process your request right now.";
        } catch (error) {
            console.error('[GroqAdapter] Failed to generate final answer:', error);
            return "I encountered an error while formulating the final answer. Please try again.";
        }
    }
}