import { FastifyInstance } from 'fastify';
import * as rateConfigurationsController from '../controllers/rate-configurations.controller';
import { validatePermissions } from '../middlewares/vaildate-permissions';
import { Actions, Permissions } from '../constants/permissions';
import { verifyToken } from '../middlewares/verifyToken';

async function rateConfigurationsRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.post('/program/:program_id/rate-configurations', {
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.RATE_CONFIGURATION])
    }, rateConfigurationsController.createRateConfigurations);

    fastify.get('/program/:program_id/rate-configurations/get-all', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.RATE_CONFIGURATION])
    }, rateConfigurationsController.getAllRateConfigurations);

    fastify.get('/program/:program_id/rate-configurations/:id', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.RATE_CONFIGURATION])
    }, rateConfigurationsController.getRateConfigurationById);

    fastify.put('/program/:program_id/rate-configurations/:id', {
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.RATE_CONFIGURATION])
    }, rateConfigurationsController.updateRateConfigurations);

    fastify.delete('/program/:program_id/rate-configurations/:id', {
        // preHandler: validatePermissions(Actions.DELETE, [Permissions.RATE_CONFIGURATION])
    }, rateConfigurationsController.deleteRateConfigurations);

    fastify.get('/program/:program_id/rate-configurations', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.RATE_CONFIGURATION])
    }, rateConfigurationsController.getAllRateConfigurationRates);

    fastify.get('/program/:program_id/get-all/hierarchie', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.RATE_CONFIGURATION])
    }, rateConfigurationsController.getAllHierarchiesAndJobTemplates);

    fastify.post('/program/:program_id/rate-configurations/budget', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.RATE_CONFIGURATION])
    }, rateConfigurationsController.getAllRateConfigurationBudget);

    fastify.post('/program/:program_id/rate-configurations/advance-filter', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.RATE_CONFIGURATION])
    }, rateConfigurationsController.rateConfigurationsFilter);
}

export default rateConfigurationsRoutes;
