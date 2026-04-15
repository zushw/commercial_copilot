import { Request, Response } from 'express';
import { ProcessCopilotQueryUseCase } from '../../../core/application/use-cases/ProcessCopilotQueryUseCase';
import { UserQuery } from '../../../core/domain/entities/UserQuery';

export class CopilotController {
    constructor(private readonly processCopilotQueryUseCase: ProcessCopilotQueryUseCase) {}

    public handleAskQuestion = async (req: Request, res: Response): Promise<void> => {
        try {
            const { question, portfolioManagerId } = req.body;

            if (!question || !portfolioManagerId) {
                res.status(400).json({ error: 'Missing required fields: question, portfolioManagerId' });
                return;
            }

            const userQuery = new UserQuery(question, portfolioManagerId);

            if (!userQuery.isValid()) {
                res.status(400).json({ error: 'Invalid query parameters' });
                return;
            }

            const response = await this.processCopilotQueryUseCase.execute(userQuery);

            res.status(200).json({
                success: true,
                data: response
            });
        } catch (error: any) {
            console.error('[CopilotController] Error processing request:', error);

            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error while processing your request.'
            });
        }
    };
}