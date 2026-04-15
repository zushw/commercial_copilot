import { ExecutionPlan } from "../../dtos/ExecutionPlanDto";

export interface LlmPort {
    generateExecutionPlan(question: string): Promise<ExecutionPlan>;
    generateSql(question: string, schema: string): Promise<string>;
    generateInsights(question: string, data: any[]): Promise<string[]>;
    generateFinalAnswer(question: string, data: any[], insights: string[]): Promise<string>;
}
