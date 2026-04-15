import 'dotenv/config';
import express from 'express';
import { MysqlDatabaseAdapter } from '../adapters/out/persistence/MysqlDatabaseAdapter';
import { GeminiAdapter } from '../adapters/out/ai/GeminiAdapter';
import { ProcessCopilotQueryUseCase } from '../core/application/use-cases/ProcessCopilotQueryUseCase';
import { CopilotController } from '../adapters/in/http/CopilotController';
import { InMemoryMessageBroker } from '../adapters/out/messaging/InMemoryMessageBroker';
import { CopilotWorkers } from '../adapters/in/workers/CopilotWorkers';
import { AuthMiddleware } from '../adapters/in/http/AuthMiddleware';
import { GroqAdapter } from '../adapters/out/ai/GroqAdapter';

async function bootstrap() {
  console.log('Starting Commercial Copilot API...');

  const dbAdapter = new MysqlDatabaseAdapter();
  // const aiAdapter = new GeminiAdapter();
  const aiAdapter = new GroqAdapter();
  const broker = new InMemoryMessageBroker();

  const workers = new CopilotWorkers(broker, dbAdapter, aiAdapter);
  workers.startListening();

  const useCase = new ProcessCopilotQueryUseCase(broker, aiAdapter);

  const copilotController = new CopilotController(useCase);

  const app = express();
  app.use(express.json());

  app.post('/api/v1/copilot/ask', AuthMiddleware.requireManagerRole, copilotController.handleAskQuestion);

  app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

  const port = process.env.PORT || 3000;
  
  app.listen(port, () => {
    console.log(`Copilot Server is running on http://localhost:${port}`);
    console.log(`Test the endpoint via POST http://localhost:${port}/api/v1/copilot/ask`);
    // console.log(process.env.PORT ? `Using the .env correctly` : `Incorrect env`)
  });
}

bootstrap().catch(error => {
  console.error('Failed to start the application:', error);
  process.exit(1);
});