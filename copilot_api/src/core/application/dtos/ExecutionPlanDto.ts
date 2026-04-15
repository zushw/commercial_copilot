export type WorkerType = 'SQL_GEN' | 'INSIGHT' | 'ANSWER_COMPOSITION';

export interface TaskNode {
  worker: WorkerType;
  depends_on: WorkerType | null;
  task: string;
}

export type ExecutionPlan = TaskNode[];