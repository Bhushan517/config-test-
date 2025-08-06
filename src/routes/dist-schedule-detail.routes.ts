import { FastifyInstance } from 'fastify'
import { createDistScheduleDetails, deleteDistScheduleDetail, getAllDistScheduleDetails, getDistScheduleDetailById, updateDistScheduleDetail } from '../controllers/dist-schedule-detail.controller';
import { verifyToken } from '../middlewares/verifyToken';
async function distScheduleRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.get('/program/:program_id/dist-schedules', getAllDistScheduleDetails);
    fastify.get('/program/:program_id/dist-schedules/:id', getDistScheduleDetailById);
    fastify.post('/program/:program_id/dist-schedules',createDistScheduleDetails );
    fastify.put('/program/:program_id/dist-schedules/:id', updateDistScheduleDetail);
    fastify.delete('/program/:program_id/dist-schedules/:id', deleteDistScheduleDetail);
}
export default distScheduleRoutes;
