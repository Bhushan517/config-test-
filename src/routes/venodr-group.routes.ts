import { FastifyInstance } from 'fastify';
import * as VendorGroupController from '../controllers/vendor-group.controller';
import { validatePermissions } from '../middlewares/vaildate-permissions';
import { Actions, Permissions } from '../constants/permissions';
import { verifyToken } from '../middlewares/verifyToken';

async function VendorGroupRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.post('/program/:program_id/vendor-groups', {
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.VENDOR_GROUP])
    }, VendorGroupController.createVendorGroup);

    fastify.get('/program/:program_id/vendor-groups/all', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR_GROUP])
    }, VendorGroupController.getVendorGroups);

    fastify.get('/program/:program_id/vendor-groups/:id', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR_GROUP])
    }, VendorGroupController.getVendorGroupById);

    fastify.put('/program/:program_id/vendor-groups/:id', {
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.VENDOR_GROUP])
    }, VendorGroupController.updateVendorGroup);

    fastify.delete('/program/:program_id/vendor-groups/:id', {
        // preHandler: validatePermissions(Actions.DELETE, [Permissions.VENDOR_GROUP])
    }, VendorGroupController.deleteVendorGroup);

    fastify.post('/program/:program_id/vendor-groups/advance-filter', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR_GROUP])
    }, VendorGroupController.vendorGroupFilter);
}

export default VendorGroupRoutes;
