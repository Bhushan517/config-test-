import { FastifyInstance } from 'fastify';
import {
  getShiftConfigurationHierarchies,
  deleteShiftConfigurationHierarchies,
  updateShiftConfigurationHierarchies,
  createShiftConfigurationHierarchies,
  getShiftConfigurationHierarchiesById,
  postRateTypesByShiftType,
  postRateTypesByShiftTypeSchema
} from '../controllers/shift-configuration-hierarchies.controller';
import { verifyToken } from '../middlewares/verifyToken';

async function shiftConfigurationHierarchiesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', verifyToken);
  fastify.post('/shift-hierarchy/shift-configuration-hierarchie', createShiftConfigurationHierarchies);
  fastify.get('/shift-hierarchy/program/:program_id/shift-configuration-hierarchie/:id', getShiftConfigurationHierarchiesById);
  fastify.put('/shift-hierarchy/program/:program_idshift-configuration-hierarchie/:id', updateShiftConfigurationHierarchies);
  fastify.delete('/shift-hierarchy/program/:program_id/shift-configuration-hierarchie/:id', deleteShiftConfigurationHierarchies);
  fastify.get('/shift-hierarchy/program/:program_id/shift-configuration-hierarchies', getShiftConfigurationHierarchies);
  fastify.route({
    method: 'POST',
    url: '/get-rate-configurations',
    schema: postRateTypesByShiftTypeSchema,
    handler: postRateTypesByShiftType
  });
}

export default shiftConfigurationHierarchiesRoutes;