import { FastifyInstance } from 'fastify';
import {
  createWorkflowField,
  updateWorkflowField,
  deleteWorkflowField,
  getAllWorkflowField,
  getWorkflowFieldById
} from '../controllers/workflow-field.controller';

async function WorkflowFieldRoutes(fastify: FastifyInstance) {
    fastify.post('/workflow-field', async (request, reply) => { await createWorkflowField(request, reply); });
    fastify.put('/workflow-field/:id', updateWorkflowField);
    fastify.delete('/workflow-field/:id', deleteWorkflowField);
    fastify.get('/workflow-field', getAllWorkflowField);
    fastify.get('/workflow-field/:id', getWorkflowFieldById);
}

export default WorkflowFieldRoutes;
