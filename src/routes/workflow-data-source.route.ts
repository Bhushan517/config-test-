import { FastifyInstance } from 'fastify';
import {
  createWorkflowDataSource,
  updateWorkflowDataSource,
  deleteWorkflowDataSource,
  getAllWorkflowDataSource,
  getWorkflowDataSourceById
} from '../controllers/workflow-data-source.controller';

async function WorkflowDataSourceRoute(fastify: FastifyInstance) {
    fastify.post('/workflow-data-source', async (request, reply) => { await createWorkflowDataSource(request, reply); });
    fastify.put('/workflow-data-source/:id', updateWorkflowDataSource);
    fastify.delete('/workflow-data-source/:id', deleteWorkflowDataSource);
    fastify.get('/workflow-data-source', getAllWorkflowDataSource);
    fastify.get('/workflow-data-source/:id', getWorkflowDataSourceById);
}

export default WorkflowDataSourceRoute;
