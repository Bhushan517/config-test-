// hierarchyCustomFieldRoutes.ts

import { FastifyInstance } from 'fastify';
import {
  createHierarchyCustomField,
  getHierarchyCustomFieldById,
  updateHierarchyCustomFieldById,
  deleteHierarchyCustomFieldById
} from '../controllers/hierarchies-custom-field.controller';

export default async function hierarchyCustomFieldRoutes(fastify: FastifyInstance) {
  fastify.post('/hierarchy-custom-fields', createHierarchyCustomField);

  fastify.get('/program/:program_id/hierarchy-custom-fields/:id', getHierarchyCustomFieldById);
  fastify.put('/program/:program_id/hierarchy-custom-fields/:id', updateHierarchyCustomFieldById);

  fastify.delete('/program/:program_id/hierarchy-custom-fields/:id', deleteHierarchyCustomFieldById);
}
