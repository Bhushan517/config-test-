import { FastifyInstance } from 'fastify';
import { getGlobalConfig, getGlobalConfigById, createGlobalConfig,updateGlobalConfigFlags, updateGlobalConfig, deleteGlobalConfig,bulkUploadGlobalConfig } from '../controllers/global-config.controller';
import { verifyToken } from '../middlewares/verifyToken';

async function globalConfigRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.get('/global-config/get-all', getGlobalConfig);
    fastify.get('/global-config/:id', getGlobalConfigById);
    fastify.post('/global-config/', createGlobalConfig);
    fastify.put('/global-config/:id', updateGlobalConfig);
    fastify.put('/global-config/global-launch', updateGlobalConfigFlags);
    fastify.delete('/global-config/:id', deleteGlobalConfig);
    fastify.post('/global-config/bulk-upload',bulkUploadGlobalConfig);
}
export default globalConfigRoutes;
