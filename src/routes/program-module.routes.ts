import { FastifyInstance } from 'fastify';
import {
  getProgramModuleById,
  getProgramModuleByIdAndQuery,
  getProgramModuleByProgramId,
  getProgramModuleByIdAndQueryForWorkFlow
} from '../controllers/program-module.controller';
async function programModuleRoutes(fastify: FastifyInstance) {
  fastify.get('/program-module/:id', getProgramModuleById);
  fastify.get('/program-module/get-rule-modules/:id', getProgramModuleByIdAndQuery);
  fastify.get('/program-module/program/:program_id', getProgramModuleByProgramId);
  fastify.get('/program-module/get-workflow-modules/:id', getProgramModuleByIdAndQueryForWorkFlow);
}

export default programModuleRoutes;