import { FastifyInstance } from 'fastify';
import * as VendorDocumentController from '../controllers/vendor-compliance-document.controller';
import { validatePermissions } from '../middlewares/vaildate-permissions';
import { Actions, Permissions } from '../constants/permissions';
import { verifyToken } from '../middlewares/verifyToken';

async function vendorComplianceDocumentRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.get('/program/:program_id/vendor-comp-doc/:id', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR_COMPLIANCE_DOCUMENT])
    }, VendorDocumentController.vendorComplianceDocumentById);

    fastify.post('/program/:program_id/vendor-comp-doc', {
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.VENDOR_COMPLIANCE_DOCUMENT])
    }, VendorDocumentController.createVendorComplianceDocument);

    fastify.delete('/program/:program_id/vendor-comp-doc/:id', {
        // preHandler: validatePermissions(Actions.DELETE, [Permissions.VENDOR_COMPLIANCE_DOCUMENT])
    }, VendorDocumentController.deleteVendorComplianceDocumentById);

    fastify.put('/program/:program_id/vendor-comp-doc/:id', {
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.VENDOR_COMPLIANCE_DOCUMENT])
    }, VendorDocumentController.updateVendorComplianceDocumentById);

    fastify.get('/program/:program_id/vendor-comp-doc', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR_COMPLIANCE_DOCUMENT])
    }, VendorDocumentController.getAllVendorCompDocummentByProgramId);

    fastify.post('/program/:program_id/vendor-comp-doc/advance-filter', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR_COMPLIANCE_DOCUMENT])
    }, VendorDocumentController.vendorComplianceDocumentFilter);

}

export default vendorComplianceDocumentRoutes;