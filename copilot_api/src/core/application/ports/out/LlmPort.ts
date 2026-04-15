export interface LlmPort {
    generateSql(question: string, schema: string): Promise<string>;
    generateInsights(question: string, data: any[]): Promise<string[]>;
    generateFinalAnswer(question: string, data: any[], insights: string[]): Promise<string>;
}
