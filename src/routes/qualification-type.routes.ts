import { FastifyInstance } from "fastify";
import {
  getQualificationTypes,
  getQualificationTypeById,
  createQualificationTypes,
  updateQualificationTypes,
  deleteQualificationTypes,
  getQualificationValueMaster,
  createQualificationsInBulk,
  getQualificationById,
  updateQualificationById,
  advancedSearchQualification
} from "../controllers/qualification-type.controller";
import { verifyToken } from "../middlewares/verifyToken";

async function qualificationTypeRouter(fastify: FastifyInstance) {
  fastify.addHook('preHandler', verifyToken);
  fastify.get('/program/:program_id/qualification-type', getQualificationTypes);
  fastify.get('/program/:program_id/qualification-type/:id', getQualificationTypeById);
  fastify.post('/program/:program_id/qualification-type', createQualificationTypes);
  fastify.put('/program/:program_id/qualification-type/:id', updateQualificationTypes);
  fastify.delete('/program/:program_id/qualification-type/:id', deleteQualificationTypes);
  fastify.get('/qualification-value', getQualificationValueMaster);
  fastify.post('/program/:program_id/qualifications-data-import', createQualificationsInBulk);
  fastify.get('/program/:program_id/qualification/:id', getQualificationById);
  fastify.put('/program/:program_id/qualification/:id', updateQualificationById);
  fastify.post('/program/:program_id/qualification-advanced-filter', advancedSearchQualification);
}

export default qualificationTypeRouter;


