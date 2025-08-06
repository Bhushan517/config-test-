
import  RateGuidanceConfigRepository  from '../repositories/rate-guidance-config.repository';
import  RateGuidanceRepository from '../repositories/rate-guidance.repository';

 class RateGuidanceService {
  private configRepo = new RateGuidanceConfigRepository();
  private eventRepo = new RateGuidanceRepository();

async process(payload: {
    program_id: string,
    is_enabled: boolean,
    rate_guidance_id?: string,
    rate_guidance: Array<{ event_name: string, is_enabled: boolean }>
  }) {
    const config = await this.configRepo.createOrUpdate(payload.program_id, payload.is_enabled);

    if (!config) {
      throw new Error('Failed to create or update rate guidance config.');
    }
    
    const rate_guidance_id = payload.rate_guidance_id || config.id;
    const isUpdate = !!payload.rate_guidance_id; 
    
    
    const rawEvents = await this.eventRepo.createOrUpdateEvents(rate_guidance_id, payload.rate_guidance, isUpdate);

    const events = rawEvents
      .filter((event): event is NonNullable<typeof event> => event !== null)
      .map(event => ({
        id: event.id,
        rate_guidance_id: event.rate_guidance_id,
        is_enabled: event.is_enabled,
        event_name: event.event,
      }));

    return {
      config,
      events,
    };
  }

async getByProgramId(program_id: string) {
  const config = await this.configRepo.findByProgramId(program_id);
  if (!config) return null;

  const events = await this.eventRepo.findEventsByRateGuidanceId(config.id);

  return {
    rate_guidance: {
      program_id: config.program_id,
      rate_guidance_id: config.id, // important: config.id becomes rate_guidance_id
      is_enable: config.dataValues.is_enable,
    },
    events: events.map(event => ({
      id: event.id,
      rate_guidance_id: event.rate_guidance_id,
      is_enabled: event.is_enabled,
      event: event.event
    }))
  };
}


}

export default RateGuidanceService;