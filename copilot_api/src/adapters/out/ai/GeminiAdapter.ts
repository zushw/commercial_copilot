import { GoogleGenerativeAI } from "@google/generative-ai";
import { LlmPort } from "../../../core/application/ports/out/LlmPort";

export class GeminiAdapter implements LlmPort {
    private genAI: GoogleGenerativeAI;
    private modelName = 'gemini-1.5-flash';

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY || ''

        if (!apiKey) {
            console.warn('[GeminiAdapter] Warning: GEMINI_API_KEY is not set in environment variables.');
        }

        this.genAI = new GoogleGenerativeAI(apiKey)
    }

    async generateSql(question: string, schema: string): Promise<string> {
        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            generationConfig: { temperature: 0 }
        });

        const prompt = `You are an expert MySQL database architect. 
        Given the following database schema:
        ${schema}
        
        Translate the user's natural language question into a valid, read-only SELECT SQL query.
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
    
        const dataString = JSON.stringify(data).substring(0, 1500);
        const insightsString = insights.join(', ');

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