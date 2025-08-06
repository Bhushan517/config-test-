import { FastifyInstance } from 'fastify';
import * as HierarchyController from '../controllers/hierarchies.controller';
import { validatePermissions } from '../middlewares/vaildate-permissions';
import { Actions, Permissions } from '../constants/permissions';
import { verifyToken } from '../middlewares/verifyToken';

async function hierarchiesRoutes(fastify: FastifyInstance) {
     fastify.addHook('preHandler', verifyToken);
    fastify.get('/program/:program_id/hierarchies/:id', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.HIERARCHY])
    }, HierarchyController.getHierarchiesById);

    fastify.post('/program/:program_id/hierarchies', {
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.HIERARCHY])
    }, HierarchyController.createHierarchies);

    fastify.put('/program/:program_id/hierarchies/:id', {
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.HIERARCHY])
    }, HierarchyController.updateHierarchies);

    fastify.get('/program/:program_id/hierarchies/', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.HIERARCHY])
    }, HierarchyController.searchHierarchies);

    fastify.post('/program/:program_id/hierarchies/advance_search', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.HIERARCHY])
    }, HierarchyController.advancedSearchHierarchies);

    fastify.get('/program/:program_id/hierarchies', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.HIERARCHY])
    }, HierarchyController.getHierarchiesByProgram);

    fastify.get('/program/:program_id/hierarchies/get-all', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.HIERARCHY])
    }, HierarchyController.getHierarchies);

    fastify.get('/program/:program_id/get-rate-model', HierarchyController.getRateModel);

    fastify.get('/program/:program_id/get-vendor-markup', HierarchyController.getVendorMarkup);

    fastify.put('/program/:program_id/update-hierarchy', {
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.HIERARCHY])
    }, HierarchyController.updateIsNotEditableFlag);

    fastify.get('/program/:program_id/hierarchies/user', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.HIERARCHY])
    }, HierarchyController.getUserHierarchies);

    fastify.post('/program/:program_id/hierarchies/advance-filter', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.HIERARCHY])
    }, HierarchyController.getHierarchiesAdvancedFilter);

    fastify.get('/program/:program_id/get-parent-hierarchy', HierarchyController.getParentHierarchies);
    fastify.get('/program/:program_id/fetch-msp', HierarchyController.getMspByClient);
    fastify.post('/program/:program_id/hierarchy/bulk-upload', HierarchyController.bulkCreateHierarchies);


}

export default hierarchiesRoutes;