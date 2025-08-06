import { FastifyInstance } from 'fastify';
import * as SupportingTextController from '../controllers/supporting-text.controller';
import { createsupportingTextSchema, paramsSchema, querySchema } from '../interfaces/supporting-text.interface';
import { validatePermissions } from '../middlewares/vaildate-permissions';
import { Actions, Permissions } from '../constants/permissions';
import { verifyToken } from '../middlewares/verifyToken';

async function supportingTextRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', verifyToken);
  fastify.post('/supporting-text', {
    schema: {
      body: createsupportingTextSchema,
    },
    // preHandler: validatePermissions(Actions.CREATE, [Permissions.SUPPORTING_TEXT])
  }, SupportingTextController.createSupportingText);

  fastify.get('/program/:program_id/supporting-text', {
    schema: {
      params: paramsSchema,
      querystring: querySchema,
    },
    // preHandler: validatePermissions(Actions.READ, [Permissions.SUPPORTING_TEXT])
  }, SupportingTextController.getAllSupportingTexts);

  fastify.get('/program/:program_id/supporting-text/:id', {
    schema: {
      params: paramsSchema,
      querystring: querySchema,
    },
    // preHandler: validatePermissions(Actions.READ, [Permissions.SUPPORTING_TEXT])
  }, SupportingTextController.getSupportingText);

  fastify.put('/supporting-text/:id', {
    schema: {
      body: createsupportingTextSchema,
    },
    // preHandler: validatePermissions(Actions.UPDATE, [Permissions.SUPPORTING_TEXT])
  }, SupportingTextController.updateSupportingText);

  fastify.delete('/program/:program_id/supporting-text/:id', {
    schema: {
      params: paramsSchema,
    }
  }, SupportingTextController.deleteSupportingText);

  fastify.post('/program/:program_id/supporting-text-advanced-filter', {
    schema: {
      params: paramsSchema,
    },
    // preHandler: validatePermissions(Actions.READ, [Permissions.SUPPORTING_TEXT])
  }, SupportingTextController.getAllSupportingTextsAdvancedFilter);
}


export default supportingTextRoutes;
