import { FastifyInstance } from 'fastify';
import {
  createWorkflowFieldConfig,
  updateWorkflowFieldConfig,
  deleteWorkflowFieldConfig,
  getAllWorkflowFieldConfig,
  getWorkflowFieldConfigById
} from '../controllers/workflow-field-config.controller';

async function WorkflowFieldConfigRoutes(fastify: FastifyInstance) {
    fastify.post('/field-config', async (request, reply) => { await createWorkflowFieldConfig(request, reply); });
    fastify.put('/field-config/:id', updateWorkflowFieldConfig);
    fastify.delete('/field-config/:id', deleteWorkflowFieldConfig);
    fastify.get('/field-config', getAllWorkflowFieldConfig);
    fastify.get('/field-config/:id', getWorkflowFieldConfigById);
}

export default WorkflowFieldConfigRoutes;
