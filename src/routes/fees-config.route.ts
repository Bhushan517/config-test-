import { FastifyInstance } from 'fastify';
import * as FeesController from '../controllers/fees-config.controller';
import { advancedSearchFeesSchema, feesConfigurationSchema, paramsSchema, querySchema } from '../interfaces/fees-config.interface';
import { Permissions, Actions } from "../constants/permissions";
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { verifyToken } from '../middlewares/verifyToken';

async function feesConfigurationRoute(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);

    fastify.get('/program/:program_id/fees/:id', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.FEE_CONFIGURATION])
    }, FeesController.getFeesConfigurationById);

    fastify.post('/program/:program_id/fees', {
        schema: {
            params: paramsSchema,
            body: feesConfigurationSchema,
        },
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.FEE_CONFIGURATION])
    }, FeesController.createFeesConfiguration);

       fastify.delete('/program/:program_id/fees/:id', {
        schema: {
            params: paramsSchema,
        },
        // preHandler: validatePermissions(Actions.DELETE, [Permissions.FEE_CONFIGURATION])
    }, FeesController.deleteFeesConfigurationById);

    fastify.put('/program/:program_id/fees/:id', {
        schema: {
            params: paramsSchema,
            body: feesConfigurationSchema,
        },
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.FEE_CONFIGURATION])
    }, FeesController.updateFeesConfigurationById);

    fastify.post('/program/:program_id/fees/advance-filter', {
        schema: {
            params: paramsSchema,
            body: advancedSearchFeesSchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.FEE_CONFIGURATION])
    }, FeesController.advancedSearchFeesConfiguration);

    fastify.get('/program/:program_id/fees', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.FEE_CONFIGURATION])
    }, FeesController.getAllFeesConfigByProgramId);

    fastify.get('/program/:program_id/fees-config', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.FEE_CONFIGURATION])
    }, FeesController.getFeesConfig);
}

export default feesConfigurationRoute;