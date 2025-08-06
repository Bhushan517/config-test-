import { FastifyInstance } from 'fastify';
import {
    createSowTemplate,
    getAllSowTemplate,
    getSowTemplate,
    updateSowTemplate,
    deleteSowTemplate,
    getSowTemplateHierarchiesByProgram
} from '../controllers/sow_template.controller';
import { verifyToken } from '../middlewares/verifyToken';

export default async function sowTemplateRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.post('/program/:program_id/sow-template',  createSowTemplate);
    fastify.get('/program/:program_id/sow-templates',  getAllSowTemplate);
    fastify.get('/program/:program_id/sow-template/get',  getSowTemplateHierarchiesByProgram);
    fastify.get('/program/:program_id/sow-template/:id',  getSowTemplate);
    fastify.put('/program/:program_id/sow-template/:id',  updateSowTemplate);
    fastify.put('/program/:program_id/delete-sow-template/:id',  deleteSowTemplate);
}
