import { FastifyInstance } from 'fastify';
import * as pickListController from '../controllers/picklist.controller';
import { createPicklistSchema, paramsSchema, querySchema } from '../interfaces/picklist.interface';
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { Actions, Permissions } from "../constants/permissions";
import { verifyToken } from '../middlewares/verifyToken';


async function picklistRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', verifyToken);
  fastify.get('/program/:program_id/picklist', {
    // preHandler: validatePermissions(Actions.READ, [Permissions.PICKLIST]),
    schema: {
      querystring: querySchema,
    }
  }, pickListController.getPicklistById);

  fastify.post('/program/:program_id/picklist', {
    // preHandler: validatePermissions(Actions.CREATE, [Permissions.PICKLIST]),
    schema: {
      body: createPicklistSchema,
    }
  }, pickListController.createPicklist);

  fastify.put('/program/:program_id/picklist/:id', {
    // preHandler: validatePermissions(Actions.UPDATE, [Permissions.PICKLIST]),
    schema: {
      body: createPicklistSchema,
      params: paramsSchema,
    }
  }, pickListController.updatePicklistAndItem);

  fastify.post('/predefined-picklist', {
    // preHandler: validatePermissions(Actions.CREATE, [Permissions.PICKLIST]),
    schema: {
      body: createPicklistSchema,
    }
  }, pickListController.createPicklistData);

  fastify.put('/program/:program_id/delete-picklist/:id', {
    // preHandler: validatePermissions(Actions.UPDATE, [Permissions.PICKLIST]),
    schema: {
      params: paramsSchema
    }
  }, pickListController.deletePicklist);

  fastify.get('/program/:program_id/picklist/:id', {
    // preHandler: validatePermissions(Actions.READ, [Permissions.PICKLIST]),
    schema: {
      params: paramsSchema,
      querystring: querySchema,
    }
  }, pickListController.getPicklistAndPicklistItem);

  fastify.get('/get-all/pickList', {
    schema: {
      querystring: querySchema,
    }
  }, pickListController.getAllPickListByProgramId);

  fastify.put('/delete-picklist/:id', {
    // preHandler: validatePermissions(Actions.UPDATE, [Permissions.PICKLIST]),
  }, pickListController.deletePredefinedPicklist);

  fastify.post('/program/:program_id/picklist/advance-filter', {
    // preHandler: validatePermissions(Actions.READ, [Permissions.PICKLIST]),
  }, pickListController.getPicklistFilter);

  fastify.get('/program/:program_id/picklists', {
    // preHandler: validatePermissions(Actions.READ, [Permissions.PICKLIST]),
  }, pickListController.getPicklists);

  fastify.put('/predefined-picklist/:id', {
    // preHandler: validatePermissions(Actions.UPDATE, [Permissions.PICKLIST]),
  }, pickListController.updatePridefinedPicklist);


}


export default picklistRoutes;