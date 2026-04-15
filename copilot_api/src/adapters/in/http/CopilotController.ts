import { Request, Response } from 'express';
import { ProcessCopilotQueryUseCase } from '../../../core/application/use-cases/ProcessCopilotQueryUseCase';
import { UserQuery } from '../../../core/domain/entities/UserQuery';

export class CopilotController {
    constructor(private readonly processCopilotQueryUseCase: ProcessCopilotQueryUseCase) {}

    public handleAskQuestion = async (req: Request, res: Response): Promise<void> => {
        try {
            const managerId = req.user?.managerId;
            const { question } = req.body;

            if (!question || !managerId) {
                res.status(400).json({ error: 'Missing required fields or unauthenticated' });
                return;
            }

            const userQuery = new UserQuery(question, managerId);

            if (!userQuery.isValid()) {
                res.status(400).json({ error: 'Invalid query parameters' });
                return;
            }

            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();

            const onProgress = (message: string) => {
                res.write(`data: ${message}\n\n`);
            }

            const response = await this.processCopilotQueryUseCase.execute(userQuery, onProgress);

            res.write(`data: ${JSON.stringify({ type: 'done', data: response })}\n\n`);
            res.end();
        } catch (error: any) {
            console.error('[CopilotController] Error processing request:', error);
            res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
            res.end();
        }
    };
}