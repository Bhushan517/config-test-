import { FastifyInstance } from 'fastify';
import { getAllVendorMarkupConfig, getVendorMarkupConfigById, createVendorMarkupConfig, calculateAverageVendorMarkupConfig, updateVendorMarkupConfig, deleteVendorMarkupConfig } from '../controllers/vendor-markup-config.controller';
import { verifyToken } from '../middlewares/verifyToken';

async function vendorMarkupConfigRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.post('/program/:program_id/vendor-markup-config', createVendorMarkupConfig);
    fastify.get('/program/:program_id/vendor-markup-config/search', getAllVendorMarkupConfig);
    fastify.get('/program/:program_id/vendor-markup-config/:id', getVendorMarkupConfigById);
    fastify.post('/program/:program_id/markup-aggregate', calculateAverageVendorMarkupConfig);
    fastify.put('/program/:program_id/vendor-markup-config/:id', updateVendorMarkupConfig);
    fastify.delete('/program/:program_id/vendor-markup-config/:id', deleteVendorMarkupConfig);
}
export default vendorMarkupConfigRoutes;