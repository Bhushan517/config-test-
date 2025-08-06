import { FastifyInstance } from 'fastify';
import {
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    getAllWorkflows,
    getWorkflowById,
    getChildWorkflows,
    updateReorder,
    createWorkflowRecipientType,
    createWorkflowLevel,
    workflowFilter
} from '../controllers/workflow.controller';

async function WorkflowRoutes(fastify: FastifyInstance) {
    fastify.post('/program/:program_id/workflow', async (request, reply) => {
        await createWorkflow(request, reply);
    });
    fastify.put('/program/:program_id/workflow/:id', updateWorkflow);
    fastify.delete('/program/:program_id/workflow/:id', deleteWorkflow);
    fastify.get('/program/:program_id/workflow', getAllWorkflows);
    fastify.get('/program/:program_id/workflow/:id', getWorkflowById);
    fastify.get('/child-workflows/program/:program_id/workflow/:workflow_id/:flow_type', getChildWorkflows);
    fastify.put('/programs/:program_id/workflow/module/:module/event_id/:event_id/:flow_type/re-order', updateReorder);
    fastify.post('/program/:program_id/workflow-triggered-recipient-type', async (request, reply) => {
        await createWorkflowRecipientType(request, reply);
    });
    fastify.post('/program/:program_id/workflow-triggered-level', async (request, reply) => {
        await createWorkflowLevel(request, reply);
    });
    fastify.post('/program/:program_id/workflowAdvanceFilter', workflowFilter);
}

export default WorkflowRoutes;
