export class CopilotResponse {
    constructor(
        public readonly answer: string,
        public readonly insight: string[],
        public readonly generatedSql?: string,
        public readonly executionTimeMs?: number
    ) {}
}