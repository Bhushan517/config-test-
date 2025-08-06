import { FastifyInstance } from 'fastify';
import * as  lebourCategoryController from '../controllers/labour-category.controller';
import { bulkUploadIndustriesSchema, createIndustriesSchema, paramsSchema, querySchema } from '../interfaces/labour-category.interface';
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { Actions, Permissions } from "../constants/permissions";
import { verifyToken } from '../middlewares/verifyToken';

async function industriesRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.post('/program/:program_id/industries', {
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.LABOUR_CATEGORY]),
        schema: {
            body: createIndustriesSchema
        }
    }, lebourCategoryController.createIndustries);

    fastify.post('/industries/bulk-upload', {
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.LABOUR_CATEGORY]),
        schema: {
            body: bulkUploadIndustriesSchema,
        }
    }, lebourCategoryController.bulkUploadIndustries);

    fastify.get('/program/:program_id/industries', lebourCategoryController.getIndustries);

    fastify.get('/program/:program_id/industries/:id', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.LABOUR_CATEGORY]),
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }, lebourCategoryController.getIndustriesById);

    fastify.put('/program/:program_id/industries/:id', {
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.LABOUR_CATEGORY]),
        schema: {
            body: createIndustriesSchema,
        }
    }, lebourCategoryController.updateIndustries);

    fastify.delete('/program/:program_id/industries/:id', {
        schema: {
            params: paramsSchema
        }
    }, lebourCategoryController.deleteIndustries);

    fastify.post('/program/:program_id/labour-category/advanced-filter', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.LABOUR_CATEGORY]),
        schema: {
            params: paramsSchema,
        }
    }, lebourCategoryController.labourCategoryFilter);

}

export default industriesRoutes;