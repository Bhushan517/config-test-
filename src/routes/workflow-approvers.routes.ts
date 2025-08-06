import { FastifyInstance } from 'fastify';
import {
    createWorkflowApprover,
    updateWorkflowApprover,
    deleteWorkflowApprover,
    getAllWorkflowApprover,
    getWorkflowApproverById
} from '../controllers/workflow-approvers.controller';

async function WorkflowApproverRoutes(fastify: FastifyInstance) {
    fastify.post('/program/:program_id/workflow-approver', async (request, reply) => { await createWorkflowApprover(request, reply); });
    fastify.put('/program/:program_id/workflow-approver/:id', updateWorkflowApprover);
    fastify.delete('/program/:program_id/workflow-approver/:id', deleteWorkflowApprover);
    fastify.get('/program/:program_id/workflow-approver', getAllWorkflowApprover);
    fastify.get('/program/:program_id/workflow-approver/:id', getWorkflowApproverById);
}

export default WorkflowApproverRoutes;
