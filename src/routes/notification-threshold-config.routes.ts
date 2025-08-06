import { FastifyInstance } from 'fastify';
import {
    createThreshold,
    getAllThresholds,
    getThresholdById,
    updateThreshold,
    deleteThreshold
} from '../controllers/notification-threshold-config.controller';

async function thresholdRoutes(fastify: FastifyInstance) {
    fastify.post('/program/:program_id/notification-thresholds', createThreshold);
    fastify.get('/program/:program_id/notification-thresholds', getAllThresholds);
    fastify.get('/program/:program_id/notification-thresholds/:id', getThresholdById);
    fastify.put('/program/:program_id/notification-thresholds', updateThreshold);
    fastify.delete('/program/:program_id/notification-thresholds/:id', deleteThreshold);
}

export default thresholdRoutes;
