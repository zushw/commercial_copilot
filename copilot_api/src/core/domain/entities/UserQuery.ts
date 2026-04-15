export class UserQuery {
    constructor(
        public readonly question: string,
        public readonly portfolioManagerId: string,
        public readonly timestamp: Date = new Date()
    ) {}

    public isValid(): boolean {
        return this.question.trim().length > 0 && this.portfolioManagerId.trim().length > 0;
    }
}