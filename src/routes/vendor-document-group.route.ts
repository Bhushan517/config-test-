import { FastifyInstance } from 'fastify';
import * as VendorDocumentGroup from '../controllers/vendor-document-group.controller';
import { validatePermissions } from '../middlewares/vaildate-permissions';
import { Actions, Permissions } from '../constants/permissions';
import { verifyToken } from '../middlewares/verifyToken';

async function vendordocumentsgroup(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.post('/program/:program_id/vendor-documents-group', {
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.VENDOR_COMPLIANCE_DOCUMENT_GROUP])
    }, VendorDocumentGroup.createVendordocumentsgroup);

    fastify.get('/program/:program_id/vendor-documents-group/:id', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR_COMPLIANCE_DOCUMENT_GROUP])
    }, VendorDocumentGroup.getVendordocumentsgroupId);

    fastify.put('/program/:program_id/vendor-documents-group/:id', {
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.VENDOR_COMPLIANCE_DOCUMENT_GROUP])
    }, VendorDocumentGroup.updateVendordocumentsgroup);

    fastify.get('/program/:program_id/vendor-group/:id', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR_COMPLIANCE_DOCUMENT_GROUP])
    }, VendorDocumentGroup.getVendorDocumentsGroupByIdAndDoc);

    fastify.delete('/program/:program_id/vendor-documents-group/:id', {
        // preHandler: validatePermissions(Actions.DELETE, [Permissions.VENDOR_COMPLIANCE_DOCUMENT_GROUP])
    }, VendorDocumentGroup.deleteVendordocumentsgroup);

    fastify.get('/program/:program_id/vendor-documents-group', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR_COMPLIANCE_DOCUMENT_GROUP])
    }, VendorDocumentGroup.getAllVendorCompDocummentGroupByProgramId);

    fastify.post('/program/:program_id/vendor-documents-group/advance-filter', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR_COMPLIANCE_DOCUMENT_GROUP])
    }, VendorDocumentGroup.vendorDocumentGroupFilter);
}

export default vendordocumentsgroup;