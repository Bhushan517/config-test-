import { FastifyInstance } from 'fastify';
import * as customFieldController from '../controllers/custom-fields.controller';
import { createCustomFieldsSchema, paramsSchema } from '../interfaces/custom-fields.interface';
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { Actions, Permissions } from "../constants/permissions";
import { verifyToken } from '../middlewares/verifyToken';

async function customFieldsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', verifyToken);

  fastify.post('/program/:program_id/custom-fields', {
    // preHandler: validatePermissions(Actions.CREATE, [Permissions.CUSTOM_FIELD]),
    schema: {
      body: createCustomFieldsSchema,
    }
  }, customFieldController.saveCustomFields);

  fastify.get('/program/:program_id/custom-fields', customFieldController.getAllCustomFields);

  fastify.get('/program/:program_id/custom-fields/:id', {
    // preHandler: validatePermissions(Actions.READ, [Permissions.CUSTOM_FIELD]),
    schema: {
      params: paramsSchema,
    }
  }, customFieldController.getCustomFieldById);

  fastify.put('/program/:program_id/custom-fields/:id', {
    // preHandler: validatePermissions(Actions.UPDATE, [Permissions.CUSTOM_FIELD]),
    schema: {
      body: createCustomFieldsSchema,
      params: paramsSchema,

    }
  }, customFieldController.updateCustomFieldById);

  fastify.delete('/program/:program_id/custom-fields/:id',
    {
      schema: {
        params: paramsSchema
      }
    }, customFieldController.deleteCustomField);

  fastify.get('/program/:program_id/custom-fields/search', {
    // preHandler: validatePermissions(Actions.READ, [Permissions.CUSTOM_FIELD]),
  }, customFieldController.searchCustomFields);

  fastify.put('/program/:program_id/custom-fields/:id/enable-disable', {
    // preHandler: validatePermissions(Actions.UPDATE, [Permissions.CUSTOM_FIELD]),
  }, customFieldController.updateCustomFieldsIsdisable);

  fastify.post('/program/:program_id/custom-fields/advance-filter', {
    // preHandler: validatePermissions(Actions.READ, [Permissions.CUSTOM_FIELD]),
  }, customFieldController.advanceFilterCustomFiled);

  fastify.put('/program/:program_id/custom-fields/reorder', {
    // preHandler: validatePermissions(Actions.READ, [Permissions.CUSTOM_FIELD]),
  }, customFieldController.reorderCustomFields);

}

export default customFieldsRoutes;