
import { FastifyRequest, FastifyReply } from 'fastify';
import  RateGuidanceService  from '../service/rate-guidance.service';
const  rateGuidanceService = new  RateGuidanceService();
 class RateGuidanceController {

  constructor() {
  }

  async RateGuidance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const payload = request.body as {
        program_id: string;
        is_enabled: boolean;
        rate_guidance_id?: string;
        rate_guidance: Array<{ event_name: string; is_enabled: boolean }>;
      };

      const result = await rateGuidanceService.process(payload);

      return reply.code(200).send({
        success: true,
        message: 'Rate guidance processed',
        response: {
          rate_guidance: {
            program_id: result.config.program_id,
            is_enable: result.config.dataValues.is_enable,
          },
          events: result.events.map(event => ({
            id: event.id,
            is_enabled: event.is_enabled,
            event_name: event.event_name,
          })),
        },
      });
    } catch (err) {
      console.error(err);
      return reply.code(500).send({
        success: false,
        message: 'Internal Server Error',
      });
    }
  }

async getRateGuidanceByProgramId(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { program_id } = request.params as { program_id: string };

    if (!program_id) {
      return reply.code(400).send({
        success: false,
        message: 'Missing program_id',
      });
    }

    const result = await rateGuidanceService.getByProgramId(program_id);

    if (!result) {
      return reply.code(404).send({
        success: false,
        message: 'Rate guidance config not found for given program_id',
      });
    }

    return reply.code(200).send({
      success: true,
      message: 'Rate guidance data retrieved',
      response: result,
    });
  } catch (err) {
    console.error('Error fetching rate guidance:', err);
    return reply.code(500).send({
      success: false,
      message: 'Internal Server Error',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

}

export default RateGuidanceController;