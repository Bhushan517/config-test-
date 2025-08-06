import { FastifyInstance } from "fastify";
import * as mtpController from '../controllers/mtp.controller';
import { verifyToken } from "../middlewares/verifyToken";

async function mtpRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.post('/program/:program_id/mtp', {
    }, mtpController.createMtp);

    fastify.get('/program/:program_id/mtp', {
    }, mtpController.getAllMtp);
    
    fastify.get('/program/:program_id/mtp/:id', {
    }, mtpController.getMtpById);

    fastify.put('/program/:program_id/link-mtp/:id', {
    }, mtpController.linkMtp);
   
    fastify.post('/program/:program_id/unlink-mtp/:id', {
    }, mtpController.unlinkMtp);

    fastify.get('/program/:program_id/get-profile-matches/:mtp_candidate_id', {
    }, mtpController.getMtp);

    
    fastify.post('/program/:program_id/submitted-candidate/:candidate_id/mtp', {
    }, mtpController.disableMtp);

    fastify.put('/program/:program_id/make-master-profile/:id', {
    }, mtpController.masterProfile);
   
    fastify.put('/program/:program_id/update-mtp/:id', {
    }, mtpController.updateMtp);
}

export default mtpRoutes;