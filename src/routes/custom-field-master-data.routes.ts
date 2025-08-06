import { FastifyInstance } from 'fastify';
import {
  saveCustomFieldsHierarchie,
  getCustomFieldById,
  updateCustomFieldById,
  deleteCustomField,
  searchCustomFields
} from '../controllers/custom-field-hierarchie.controller';
import { createCustomFieldmasterData, paramsSchema } from '../interfaces/custom-field-master-data.interface';
async function customFieldsMasterDataRoutes(fastify: FastifyInstance) {
  fastify.post('/custom-fields-master-data',
    {
      schema: {
        body: createCustomFieldmasterData,
        }
    }, saveCustomFieldsHierarchie);
  fastify.get('/program/:program_id/custom-fields--master-data/:id',
    getCustomFieldById);
  fastify.put('/program/:program_id/custom-fields--master-data/:id', 
    {
  schema: {
      body: createCustomFieldmasterData,
      params: paramsSchema
    }
  },
    updateCustomFieldById);
  fastify.delete('/program/:program_id/custom-fields--master-data/:id', deleteCustomField);
  fastify.get('/program/:program_id/custom-fields--master-data', searchCustomFields);
}

export default customFieldsMasterDataRoutes;