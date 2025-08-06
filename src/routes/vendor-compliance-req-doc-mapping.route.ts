import { FastifyInstance } from 'fastify';
import {
    createVendorComplianceReqDoc,
    getAllVendorComplianceReqDoc,
    getVendorComplianceReqDocById,
    updateVendorComplianceReqDoc,
    deleteVendorComplianceReqDoc

} from '../controllers/vendor-compliance-req-doc-mapping.controller';
import { verifyToken } from '../middlewares/verifyToken';

async function vendorComplianceReqDocMappingRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.post('/vendor_compliance_req_doc', createVendorComplianceReqDoc);
    fastify.get('/program/:program_id/vendor_compliance_req_docs', getAllVendorComplianceReqDoc);
    fastify.get('/program/:program_id/vendor_compliance_req_doc/:id', getVendorComplianceReqDocById);
    fastify.put('/program/:program_id/vendor_compliance_req_doc/:id', updateVendorComplianceReqDoc);
    fastify.delete('/program/:program_id/vendor_compliance_req_doc/:id', deleteVendorComplianceReqDoc);
}
export default vendorComplianceReqDocMappingRoutes;