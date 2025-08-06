import { FastifyInstance } from 'fastify';
import * as WorklocationController from '../controllers/work-location.controller';
import { validatePermissions } from '../middlewares/vaildate-permissions';
import { Actions, Permissions } from '../constants/permissions';
import { verifyToken } from '../middlewares/verifyToken';

async function workLocationRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.post('/work-location', {
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.WORK_LOCATION])
    }, WorklocationController.createWorkLocation);

    fastify.get('/program/:program_id/work-location', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.WORK_LOCATION])
    }, WorklocationController.getAllWorkLocations);

    fastify.get('/program/:program_id/work-location/:id', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.WORK_LOCATION])
    }, WorklocationController.getWorkLocationById);

    fastify.put('/work-location/:id', {
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.WORK_LOCATION])
    }, WorklocationController.updateWorkLocation);

    fastify.delete('/program/:program_id/work-location/:id', WorklocationController.deleteWorkLocationById);

    fastify.get('/program/:program_id/work-location-country', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.WORK_LOCATION])
    }, WorklocationController.getAllWorkLocationsCountry);

    fastify.get('/program/:program_id/work-location-countries', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.WORK_LOCATION])
    }, WorklocationController.getAllCountry);

    fastify.post('/program/:program_id/work-location-advanced-filter', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.WORK_LOCATION])
    }, WorklocationController.getWorkLocationsAdvancedFilter);
}

export default workLocationRoutes;