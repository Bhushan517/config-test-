import { FastifyInstance } from 'fastify';
import * as TimesheetTypeConfigController from '../controllers/timesheet-type-config.controller';
import { createTimesheetTypeConfigSchema, paramsSchema, querySchema, timesheetTypeConfigFilterSchema } from '../interfaces/timesheet-config.interface';
import { validatePermissions } from '../middlewares/vaildate-permissions';
import { Actions, Permissions } from '../constants/permissions';
import { verifyToken } from '../middlewares/verifyToken';

async function timesheetTypeConfigRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.post('/timesheet-type-config', {
        schema: {
            params: paramsSchema,
            body: createTimesheetTypeConfigSchema
        },
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.TIMESHEET_TYPE_CONFIGURATION])
    }, TimesheetTypeConfigController.createTimesheetTypeConfig);

    fastify.get('/timesheet-type-config/get-all', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.TIMESHEET_TYPE_CONFIGURATION])
    }, TimesheetTypeConfigController.getAllTimesheetTypeConfigs);

    fastify.get('/timesheet-type-config/get', {
        schema: {
            params: paramsSchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.TIMESHEET_TYPE_CONFIGURATION])
    }, TimesheetTypeConfigController.getAllRelatedDataByProgram);

    fastify.get('/timesheet-type-config/:id', {
        schema: {
            params: paramsSchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.TIMESHEET_TYPE_CONFIGURATION])
    }, TimesheetTypeConfigController.getTimesheetTypeConfigById);

    fastify.put('/timesheet-type-config/:id', {
        schema: {
            params: paramsSchema,
            body: createTimesheetTypeConfigSchema
        },
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.TIMESHEET_TYPE_CONFIGURATION])
    }, TimesheetTypeConfigController.updateTimesheetTypeConfig);

    fastify.delete('/timesheet-type-config/:id', {
        schema: {
            params: paramsSchema,
            body: createTimesheetTypeConfigSchema
        }
    }, TimesheetTypeConfigController.deleteTimesheetTypeConfig);

    fastify.post('/timesheet-type-config/advanced-filter', {
        schema: {
            params: paramsSchema,
            body: timesheetTypeConfigFilterSchema
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.TIMESHEET_TYPE_CONFIGURATION])
    }, TimesheetTypeConfigController.timesheetTypeConfigFilter);

    fastify.post('/timesheet-type', {
        schema: {
            params: paramsSchema,
            body: timesheetTypeConfigFilterSchema
        },
    }, TimesheetTypeConfigController.timesheetTypeConfigGetAllFilter);
}

export default timesheetTypeConfigRoutes;