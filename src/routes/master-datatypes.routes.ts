import { FastifyInstance } from 'fastify';
import * as FoundationalDataTypeController from '../controllers/master-datatypes.controller';
import { createFoundationalDataTypeSchema, paramsSchema, querySchema } from '../interfaces/master-datatypes.interface';
import { validatePermissions } from '../middlewares/vaildate-permissions';
import { Actions, Permissions } from '../constants/permissions';
import { verifyToken } from '../middlewares/verifyToken';

async function foundationalDataTypeRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.post('/program/:program_id/foundational-datatypes', {
        schema: {
            body: createFoundationalDataTypeSchema,
            params: paramsSchema,
        },
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.MASTER_DATA])
    }, FoundationalDataTypeController.createFoundationalDataTypes);

    fastify.put('/program/:program_id/foundational-datatypes/:id', {
        schema: {
            body: createFoundationalDataTypeSchema,
            params: paramsSchema,
        },
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.MASTER_DATA])
    }, FoundationalDataTypeController.updateFoundationalDataTypes);

    fastify.delete('/program/:program_id/foundational-datatypes/:id', {
        schema: {
            params: paramsSchema,
        }
    }, FoundationalDataTypeController.deleteFoundationalDataTypes);

    fastify.get('/program/:program_id/foundational-datatypes', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.MASTER_DATA])
    }, FoundationalDataTypeController.getAllFoundationalDataTypes);

    fastify.get('/program/:program_id/foundational-datatypes/:id', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.MASTER_DATA])
    }, FoundationalDataTypeController.getFoundationalDataTypeById);

    fastify.post('/program/:program_id/master-data-types', {
        schema: {
            params: paramsSchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.MASTER_DATA])
    }, FoundationalDataTypeController.getAllFoundationalDataTypesAdvancedFilter);

    fastify.put('/program/:program_id/master-data-type/reorder',{

    },FoundationalDataTypeController.foundationaDataTypeReorder)
}

export default foundationalDataTypeRoutes;
