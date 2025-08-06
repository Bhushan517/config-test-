import { FastifyInstance } from 'fastify';
import {
    getAllJobWorkFlow,
    getJobWorkFlowById,
    createJobWorkFlow,
    updateJobWorkFlow,
    deleteJobWorkFlow,
    getWorkflowForJob,
    updateWorkflowStatus,
    updateReplaceLevel,
    rejectLevel,
    getUpdateWorkflowApprovals,
    imporsonateLevel,
    getModuleEvent,
    getUnifiedWorkflowHandler
    // sendSequencialNotification
} from '../controllers/job-workflow.controller';

async function JobWorkFlowRoutes(fastify: FastifyInstance) {
    fastify.get('/program/:program_id/job-workflow', getAllJobWorkFlow);
    fastify.get('/program/:program_id/job-workflow/:id', getJobWorkFlowById);
    fastify.post('/program/:program_id/job-workflow', createJobWorkFlow);
    fastify.put('/program/:program_id/job-workflow/:id', updateJobWorkFlow);
    fastify.put('/update-status/program/:program_id/job-workflow/:id', updateWorkflowStatus);
    fastify.put('/reject-status/program/:program_id/job-workflow/:id', rejectLevel);
    fastify.put('/replace-user/program/:program_id/job-workflow/:id', updateReplaceLevel);
    fastify.put('/imporsonate-user/program/:program_id/job-workflow/:id', imporsonateLevel);
    fastify.delete('/program/:program_id/job-workflow/:id', deleteJobWorkFlow);
    fastify.get('/program/:program_id/workflow-approval', getWorkflowForJob);
    fastify.get('/program/:program_id/update-workflow-approval', getUpdateWorkflowApprovals);
    fastify.get('/program/:program_id/all-workflow', getUnifiedWorkflowHandler);
    fastify.get('/program/:program_id/get-module-event', getModuleEvent)
    // fastify.post("/program/:program_id/workflow-id/:job_workflow_id", sendSequencialNotification);
}
export default JobWorkFlowRoutes;