import { FastifyInstance } from 'fastify';
import  RateGuidanceController  from '../controllers/rate-guidance-config.controller';

export async function rateGuidanceConfigRoutes(fastify: FastifyInstance) {
  const controller = new RateGuidanceController();

  fastify.post('/rate-guidance', controller.RateGuidance);
  fastify.get('/rate-guidance/:program_id', controller.getRateGuidanceByProgramId);
}

